import type { OnboardingPlan } from './onboarding';

export type ProvisioningSurfaceStatus = 'disabled' | 'planned' | 'configured' | 'connected';
export type ProvisioningMode = 'local_demo' | 'production_phase_1' | 'provisioning_configured';
export type ComputerProviderName = 'local_stub' | 'self_hosted' | 'e2b' | 'browserbase' | 'scrapybara' | 'daytona' | 'modal';

export type ProviderReadinessCheck = {
  label: string;
  status: ProvisioningSurfaceStatus;
  required: boolean;
  envVar?: string;
};

export type ProvisioningReadiness = {
  mode: ProvisioningMode;
  selectedProvider: ComputerProviderName | null;
  providerLabel: string;
  canProvisionRealMinion: boolean;
  missingRequiredEnv: string[];
  missingReadinessItems: string[];
  providerReadinessChecks: ProviderReadinessCheck[];
  credentialSetup: ProvisioningSurfaceStatus;
  workspaceProvider: ProvisioningSurfaceStatus;
  hermesTemplate: ProvisioningSurfaceStatus;
  credentialVault: ProvisioningSurfaceStatus;
  phone: ProvisioningSurfaceStatus;
  email: ProvisioningSurfaceStatus;
  paymentCard: ProvisioningSurfaceStatus;
  apps: ProvisioningSurfaceStatus;
  memory: ProvisioningSurfaceStatus;
  observability: ProvisioningSurfaceStatus;
  launchLabel: string;
  launchBlockedReason: string;
};

export type ProvisioningRequest = {
  blueprint: OnboardingPlan;
  ownerUserId: string;
};

export type ProvisioningResult = {
  status: 'not_configured' | 'prepared';
  message: string;
  workspaceUrl: string | null;
  hermesConfigPreview: Record<string, unknown>;
};

export type WorkspaceStatus = {
  minionId: string;
  provider: ComputerProviderName | null;
  status: ProvisioningSurfaceStatus;
  message: string;
};

export interface ComputerProvider {
  providerName: ComputerProviderName;
  checkReadiness(): ProviderReadinessCheck[];
  prepareWorkspace(blueprint: OnboardingPlan): Promise<WorkspaceStatus>;
  launchWorkspace(minionId: string): Promise<WorkspaceStatus>;
  stopWorkspace(minionId: string): Promise<WorkspaceStatus>;
  getWorkspaceStatus(minionId: string): Promise<WorkspaceStatus>;
  getAccessUrl(minionId: string): Promise<string | null>;
  attachCredentials(minionId: string, credentialRefs: string[]): Promise<WorkspaceStatus>;
}

export interface WorkspaceProvider extends ComputerProvider {}

export interface HermesTemplateProvider {
  checkReadiness(): ProviderReadinessCheck[];
  renderHermesConfig(blueprint: OnboardingPlan): Record<string, unknown>;
}

export interface CredentialVaultProvider {
  checkReadiness(): ProviderReadinessCheck[];
  attachCredentials(minionId: string, credentialRefs: string[]): Promise<WorkspaceStatus>;
}

export interface MinionRuntimeProvider {
  checkReadiness(): ProvisioningReadiness;
  prepareWorkspace(request: ProvisioningRequest): Promise<ProvisioningResult>;
  launchWorkspace(minionId: string): Promise<WorkspaceStatus>;
  stopWorkspace(minionId: string): Promise<WorkspaceStatus>;
  getWorkspaceStatus(minionId: string): Promise<WorkspaceStatus>;
  getAccessUrl(minionId: string): Promise<string | null>;
  attachCredentials(minionId: string, credentialRefs: string[]): Promise<WorkspaceStatus>;
  renderHermesConfig(blueprint: OnboardingPlan): Record<string, unknown>;
}

const providerLabels: Record<ComputerProviderName, string> = {
  local_stub: 'Local stub',
  self_hosted: 'Self-hosted pool',
  e2b: 'E2B adapter',
  browserbase: 'Browserbase adapter',
  scrapybara: 'Scrapybara adapter',
  daytona: 'Daytona adapter',
  modal: 'Modal adapter',
};

const providerSpecificEnv: Partial<Record<ComputerProviderName, string[]>> = {
  e2b: ['E2B_API_KEY'],
  browserbase: ['BROWSERBASE_API_KEY'],
  scrapybara: ['SCRAPYBARA_API_KEY'],
};

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function configuredWhen(name: string): ProvisioningSurfaceStatus {
  return hasEnv(name) ? 'configured' : 'disabled';
}

function getSelectedComputerProvider(): ComputerProviderName | null {
  const value = process.env.MINIONMINT_COMPUTER_PROVIDER?.trim() as ComputerProviderName | undefined;
  if (!value || value === 'local_stub') return null;
  if (value in providerLabels) return value;
  return null;
}

function readinessFromEnv(label: string, envVar: string, required = true): ProviderReadinessCheck {
  return {
    label,
    envVar,
    required,
    status: configuredWhen(envVar),
  };
}

function getProviderReadinessChecks(provider: ComputerProviderName | null): ProviderReadinessCheck[] {
  const checks: ProviderReadinessCheck[] = [
    readinessFromEnv('Computer provider selected', 'MINIONMINT_COMPUTER_PROVIDER'),
    readinessFromEnv('Hermes template or base image', 'MINIONMINT_HERMES_TEMPLATE_REF'),
    readinessFromEnv('Credential vault provider', 'MINIONMINT_CREDENTIAL_VAULT_PROVIDER'),
  ];

  if (hasEnv('MINIONMINT_WORKSPACE_REGION')) checks.push(readinessFromEnv('Workspace region', 'MINIONMINT_WORKSPACE_REGION', false));
  if (hasEnv('MINIONMINT_WORKSPACE_BASE_IMAGE')) checks.push(readinessFromEnv('Workspace base image', 'MINIONMINT_WORKSPACE_BASE_IMAGE', false));

  if (provider === 'self_hosted') {
    return checks.concat([
      readinessFromEnv('Self-hosted workspace root', 'MINIONMINT_SELF_HOSTED_WORKSPACE_ROOT'),
      readinessFromEnv('Self-hosted process supervisor launch command', 'MINIONMINT_SELF_HOSTED_LAUNCH_COMMAND'),
      readinessFromEnv('Public access or console base URL', 'MINIONMINT_SELF_HOSTED_CONSOLE_BASE_URL', false),
      { label: 'Per-Minion workspace volume', required: true, status: hasEnv('MINIONMINT_SELF_HOSTED_WORKSPACE_ROOT') ? 'configured' as const : 'planned' as const },
      { label: 'Per-Minion Hermes profile config', required: true, status: hasEnv('MINIONMINT_HERMES_TEMPLATE_REF') ? 'configured' as const : 'planned' as const },
      { label: 'Secure credential storage', required: true, status: hasEnv('MINIONMINT_CREDENTIAL_VAULT_PROVIDER') ? 'configured' as const : 'planned' as const },
      { label: 'Owner stop and takeover controls', required: true, status: hasEnv('MINIONMINT_SELF_HOSTED_LAUNCH_COMMAND') ? 'configured' as const : 'planned' as const },
      { label: 'Logging and observability', required: false, status: 'planned' as const },
    ]);
  }

  if (provider !== null) {
    const providerName = provider;
    for (const envVar of providerSpecificEnv[providerName] ?? []) {
      checks.push(readinessFromEnv(`${providerLabels[providerName]} credential`, envVar));
    }
  }

  return checks;
}

export function getProvisioningMode(): ProvisioningMode {
  const readiness = getProviderReadinessChecks(getSelectedComputerProvider());
  const canProvision = readiness.every((check) => !check.required || check.status === 'configured' || check.status === 'connected');
  if (canProvision) return 'provisioning_configured';
  if (hasEnv('DATABASE_URL') && hasEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') && hasEnv('CLERK_SECRET_KEY') && hasEnv('OPENAI_API_KEY')) return 'production_phase_1';
  return 'local_demo';
}

export function getProvisioningReadiness(): ProvisioningReadiness {
  const selectedProvider = getSelectedComputerProvider();
  const providerReadinessChecks = getProviderReadinessChecks(selectedProvider);
  const missingRequiredEnv = providerReadinessChecks
    .filter((check) => check.required && check.envVar && check.status !== 'configured' && check.status !== 'connected')
    .map((check) => check.envVar as string);
  const missingReadinessItems = providerReadinessChecks
    .filter((check) => check.required && check.status !== 'configured' && check.status !== 'connected')
    .map((check) => check.label);
  const canProvisionRealMinion = missingReadinessItems.length === 0;
  const hermesTemplate = configuredWhen('MINIONMINT_HERMES_TEMPLATE_REF');
  const credentialVault = configuredWhen('MINIONMINT_CREDENTIAL_VAULT_PROVIDER');

  return {
    mode: getProvisioningMode(),
    selectedProvider,
    providerLabel: selectedProvider ? providerLabels[selectedProvider] : 'No computer provider selected',
    canProvisionRealMinion,
    missingRequiredEnv,
    missingReadinessItems,
    providerReadinessChecks,
    credentialSetup: credentialVault,
    workspaceProvider: selectedProvider ? configuredWhen('MINIONMINT_COMPUTER_PROVIDER') : 'disabled',
    hermesTemplate,
    credentialVault,
    phone: configuredWhen('AGENTPHONE_API_KEY'),
    email: configuredWhen('AGENTMAIL_API_KEY'),
    paymentCard: configuredWhen('AGENTCARD_API_KEY'),
    apps: configuredWhen('COMPOSIO_API_KEY'),
    memory: hermesTemplate === 'configured' ? 'configured' : 'planned',
    observability: configuredWhen('LATITUDE_API_KEY'),
    launchLabel: canProvisionRealMinion ? 'Prepare Minion workspace' : 'Live provisioning disabled',
    launchBlockedReason: canProvisionRealMinion
      ? `${selectedProvider ? providerLabels[selectedProvider] : 'Workspace provider'} readiness is configured. The next implementation step is connecting the selected adapter to live launch calls.`
      : `Live provisioning disabled: ${missingReadinessItems.join(', ')}`,
  };
}

export function buildHermesConfigPreview(blueprint: OnboardingPlan) {
  return {
    minionName: blueprint.agentSpec.name,
    mission: blueprint.mission,
    approvalMode: blueprint.agentSpec.approvalMode,
    tools: blueprint.agentSpec.tools,
    knowledgeSources: blueprint.knowledgeSources,
    approvalRails: blueprint.approvalRails,
    workspacePlan: blueprint.workstationPlan,
    memoryPlan: blueprint.knowledgeVaultPlan,
  };
}

class LocalStubComputerProvider implements ComputerProvider {
  providerName: ComputerProviderName = 'local_stub';

  checkReadiness() {
    return getProviderReadinessChecks(getSelectedComputerProvider());
  }

  async prepareWorkspace(blueprint: OnboardingPlan) {
    return {
      minionId: blueprint.agentSpec.name,
      provider: getSelectedComputerProvider(),
      status: 'planned' as const,
      message: 'Provider-neutral workspace preparation is planned. No live workspace has been launched by the local stub.',
    };
  }

  async launchWorkspace(minionId: string) {
    return this.workspaceStatus(minionId, 'Launch requires a selected live ComputerProvider adapter.');
  }

  async stopWorkspace(minionId: string) {
    return this.workspaceStatus(minionId, 'Stop requires a selected live ComputerProvider adapter.');
  }

  async getWorkspaceStatus(minionId: string) {
    return this.workspaceStatus(minionId, 'No live workspace exists in local stub mode.');
  }

  async getAccessUrl(minionId: string) {
    void minionId;
    return null;
  }

  async attachCredentials(minionId: string, credentialRefs: string[]) {
    void credentialRefs;
    return this.workspaceStatus(minionId, 'Credential attachment requires a configured credential vault.');
  }

  private workspaceStatus(minionId: string, message: string): WorkspaceStatus {
    return {
      minionId,
      provider: getSelectedComputerProvider(),
      status: 'disabled',
      message,
    };
  }
}

class SelfHostedComputerProvider implements ComputerProvider {
  providerName: ComputerProviderName = 'self_hosted';

  checkReadiness() {
    return getProviderReadinessChecks('self_hosted');
  }

  async prepareWorkspace(blueprint: OnboardingPlan) {
    return {
      minionId: blueprint.agentSpec.name,
      provider: this.providerName,
      status: hasEnv('MINIONMINT_SELF_HOSTED_WORKSPACE_ROOT') ? 'configured' as const : 'planned' as const,
      message: hasEnv('MINIONMINT_SELF_HOSTED_WORKSPACE_ROOT')
        ? 'Self-hosted adapter can prepare a per-Minion workspace directory and Hermes profile files.'
        : 'Set MINIONMINT_SELF_HOSTED_WORKSPACE_ROOT before preparing owned workspace files.',
    };
  }

  async launchWorkspace(minionId: string) {
    return this.workspaceStatus(minionId, hasEnv('MINIONMINT_SELF_HOSTED_LAUNCH_COMMAND') ? 'configured' : 'planned', hasEnv('MINIONMINT_SELF_HOSTED_LAUNCH_COMMAND') ? 'Self-hosted launch command is configured for supervisor handoff.' : 'Set MINIONMINT_SELF_HOSTED_LAUNCH_COMMAND before launch.');
  }

  async stopWorkspace(minionId: string) {
    return this.workspaceStatus(minionId, 'configured', 'Self-hosted stop requested through the runtime process supervisor.');
  }

  async getWorkspaceStatus(minionId: string) {
    return this.workspaceStatus(minionId, hasEnv('MINIONMINT_SELF_HOSTED_WORKSPACE_ROOT') ? 'configured' : 'planned', 'Self-hosted workspace status is tracked in the Minion runtime record.');
  }

  async getAccessUrl(minionId: string) {
    const baseUrl = process.env.MINIONMINT_SELF_HOSTED_CONSOLE_BASE_URL?.replace(/\/$/, '');
    return baseUrl ? `${baseUrl}/${encodeURIComponent(minionId)}` : null;
  }

  async attachCredentials(minionId: string, credentialRefs: string[]) {
    return this.workspaceStatus(minionId, credentialRefs.length > 0 ? 'configured' : 'planned', credentialRefs.length > 0 ? 'Credential references attached to scaffolded vault path.' : 'No credential references attached yet.');
  }

  private workspaceStatus(minionId: string, status: ProvisioningSurfaceStatus, message: string): WorkspaceStatus {
    return {
      minionId,
      provider: this.providerName,
      status,
      message,
    };
  }
}

export class ProviderNeutralMinionRuntimeProvider {
  private computerProvider: ComputerProvider;

  constructor() {
    this.computerProvider = getSelectedComputerProvider() === 'self_hosted' ? new SelfHostedComputerProvider() : new LocalStubComputerProvider();
  }

  checkReadiness() {
    return getProvisioningReadiness();
  }

  async prepareWorkspace(request: ProvisioningRequest): Promise<ProvisioningResult> {
    const readiness = this.checkReadiness();
    await this.computerProvider.prepareWorkspace(request.blueprint);
    return {
      status: readiness.canProvisionRealMinion ? 'prepared' : 'not_configured',
      message: readiness.canProvisionRealMinion
        ? 'The provider-neutral readiness contract is satisfied. The selected adapter still needs live launch implementation before a real Minion workspace is created.'
        : 'Provisioning mode is not configured. MinionMint can save and review the blueprint, but cannot create a real Minion workspace yet.',
      workspaceUrl: null,
      hermesConfigPreview: buildHermesConfigPreview(request.blueprint),
    };
  }

  launchWorkspace(minionId: string) {
    return this.computerProvider.launchWorkspace(minionId);
  }

  stopWorkspace(minionId: string) {
    return this.computerProvider.stopWorkspace(minionId);
  }

  getWorkspaceStatus(minionId: string) {
    return this.computerProvider.getWorkspaceStatus(minionId);
  }

  getAccessUrl(minionId: string) {
    return this.computerProvider.getAccessUrl(minionId);
  }

  attachCredentials(minionId: string, credentialRefs: string[]) {
    return this.computerProvider.attachCredentials(minionId, credentialRefs);
  }

  renderHermesConfig(blueprint: OnboardingPlan) {
    return buildHermesConfigPreview(blueprint);
  }
}

export function getMinionRuntimeProvider(): MinionRuntimeProvider {
  return new ProviderNeutralMinionRuntimeProvider();
}

export function getMinionProvisioningProvider(): MinionRuntimeProvider {
  return getMinionRuntimeProvider();
}

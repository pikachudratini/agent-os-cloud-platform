import type { OnboardingPlan } from './onboarding';

export type ProvisioningSurfaceStatus = 'disabled' | 'planned' | 'configured' | 'connected';
export type ProvisioningMode = 'local_demo' | 'production_phase_1' | 'provisioning_configured';

export type ProvisioningReadiness = {
  mode: ProvisioningMode;
  canProvisionRealMinion: boolean;
  missingRequiredEnv: string[];
  credentialSetup: ProvisioningSurfaceStatus;
  orgoWorkspace: ProvisioningSurfaceStatus;
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

export interface MinionProvisioningProvider {
  readiness(): ProvisioningReadiness;
  prepare(request: ProvisioningRequest): Promise<ProvisioningResult>;
}

const requiredProvisioningEnv = ['ORGO_API_KEY', 'HERMES_TEMPLATE_REF', 'CREDENTIAL_VAULT_PROVIDER'];

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function configuredWhen(name: string): ProvisioningSurfaceStatus {
  return hasEnv(name) ? 'configured' : 'disabled';
}

export function getProvisioningMode(): ProvisioningMode {
  if (requiredProvisioningEnv.every(hasEnv)) return 'provisioning_configured';
  if (hasEnv('DATABASE_URL') && hasEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') && hasEnv('CLERK_SECRET_KEY') && hasEnv('OPENAI_API_KEY')) return 'production_phase_1';
  return 'local_demo';
}

export function getProvisioningReadiness(): ProvisioningReadiness {
  const missingRequiredEnv = requiredProvisioningEnv.filter((name) => !hasEnv(name));
  const canProvisionRealMinion = missingRequiredEnv.length === 0;
  return {
    mode: getProvisioningMode(),
    canProvisionRealMinion,
    missingRequiredEnv,
    credentialSetup: configuredWhen('CREDENTIAL_VAULT_PROVIDER'),
    orgoWorkspace: configuredWhen('ORGO_API_KEY'),
    hermesTemplate: configuredWhen('HERMES_TEMPLATE_REF'),
    credentialVault: configuredWhen('CREDENTIAL_VAULT_PROVIDER'),
    phone: configuredWhen('AGENTPHONE_API_KEY'),
    email: configuredWhen('AGENTMAIL_API_KEY'),
    paymentCard: configuredWhen('AGENTCARD_API_KEY'),
    apps: configuredWhen('COMPOSIO_API_KEY'),
    memory: hasEnv('HERMES_TEMPLATE_REF') ? 'configured' : 'planned',
    observability: configuredWhen('LATITUDE_API_KEY'),
    launchLabel: canProvisionRealMinion ? 'Prepare Minion workspace' : 'Provisioning not configured',
    launchBlockedReason: canProvisionRealMinion
      ? 'Provider interface is configured. The next implementation step is calling the real Orgo and Hermes APIs.'
      : `Missing provisioning environment: ${missingRequiredEnv.join(', ')}`,
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

export class StubMinionProvisioningProvider implements MinionProvisioningProvider {
  readiness() {
    return getProvisioningReadiness();
  }

  async prepare(request: ProvisioningRequest): Promise<ProvisioningResult> {
    const readiness = this.readiness();
    return {
      status: readiness.canProvisionRealMinion ? 'prepared' : 'not_configured',
      message: readiness.canProvisionRealMinion
        ? 'Provisioning provider interface is configured, but live Orgo/Hermes API calls are intentionally not implemented in this Phase 1 bridge.'
        : 'Provisioning mode is not configured. MinionMint can save and review the blueprint, but cannot create a real Orgo/Hermes Minion yet.',
      workspaceUrl: null,
      hermesConfigPreview: buildHermesConfigPreview(request.blueprint),
    };
  }
}

export function getMinionProvisioningProvider(): MinionProvisioningProvider {
  return new StubMinionProvisioningProvider();
}

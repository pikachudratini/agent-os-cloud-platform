export type AgentSpec = {
  name: string;
  role: string;
  systemPrompt: string;
  model: string;
  tone: string;
  tools: string[];
  guardrails: string[];
  knowledgeSources: string[];
  approvalMode: 'drafts_require_approval' | 'autonomous_internal_only';
};

export interface ModelCapabilities {
  vision: boolean;
  webSearch: boolean;
  reasoning: boolean;
  imageGeneration: boolean;
}

export interface ModelConfig {
  label: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  capabilities: ModelCapabilities;
}

export interface AppSettings {
  debugMode: boolean;
  exportFormat: "json" | "markdown";
  routingModel: string;
  chatModel: string;
  webSearchModel: string;
  reasoningModel: string;
  imageGenerationModel: string;
  models: ModelConfig[];
}

export type ModelRole = "chat" | "reasoning" | "router";

export interface ModelConfigIssue {
  role: ModelRole;
  roleLabel: string;
  modelLabel: string | null;
  modelName: string | null;
  missingApiKey: boolean;
  missingBaseUrl: boolean;
}

export interface ModelConfigStatus {
  configured: boolean;
  issues: ModelConfigIssue[];
}

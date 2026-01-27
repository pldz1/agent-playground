export interface ModelCapabilities {
  vision: boolean;
  webSearch: boolean;
  reasoning: boolean;
  image: boolean;
}

export interface ModelConfig {
  label: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  capabilities: ModelCapabilities;
}

export interface ChatAgentSettings {
  routingModel: string;
  chatModel: string;
  webSearchModel: string;
  reasoningModel: string;
  visionModel: string;
  imageModel: string;
  chatContextLength: number;
}

export interface AppSettings {
  debugMode: boolean;
  exportFormat: 'json' | 'markdown';
  chatAgent: ChatAgentSettings;
  models: ModelConfig[];
}

export type ModelRole = 'routing' | 'chat' | 'vision' | 'reasoning' | 'image' | 'webSearch';

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

export interface RuntimeModel {
  label: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
}

export interface RuntimeAuthConfig {
  role: ModelRole;
  modelName: string;
  model: RuntimeModel;
  apiKey: string;
  baseUrl: string;
  apiVersion: string;
}

export interface ModelResolution {
  modelName: string;
  model: RuntimeModel;
  settings: AppSettings;
}

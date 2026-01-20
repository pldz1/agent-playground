import {
  Brain,
  Eye,
  Globe2,
  Image as ImageIcon,
  Network,
  Power,
  Server,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { ModelCapabilities, ModelConfig } from '@/types';

export type ProviderOptionId = 'openai' | 'anthropic' | 'azure-openai' | 'ollama' | 'custom';

export interface ProviderOption {
  value: ProviderOptionId;
  label: string;
  description: string;
  defaultBaseUrl: string;
  icon: ComponentType<{ className?: string }>;
}

export interface ModelFormState {
  label: string;
  name: string;
  providerPreset: ProviderOptionId;
  provider: string;
  baseUrl: string;
  apiKey: string;
  capabilities: ModelCapabilities;
}

export type ModelSettingKey =
  | 'routingModel'
  | 'chatModel'
  | 'visionModel'
  | 'webSearchModel'
  | 'reasoningModel'
  | 'imageModel';

export const MODEL_SELECT_COPY: Record<ModelSettingKey, { label: string; description: string }> = {
  routingModel: {
    label: 'Routing model',
    description: 'Determines how user intents are classified and routed to the right toolchain.',
  },
  chatModel: {
    label: 'Chat model',
    description: 'Acts as the default chat model for agent replies.',
  },
  visionModel: {
    label: 'Vision model',
    description: 'The model capable of understanding image content.',
  },
  webSearchModel: {
    label: 'Web search model',
    description: 'Handles web search and tool-calling tasks.',
  },
  reasoningModel: {
    label: 'Reasoning model',
    description: 'Handles deliberate, multi-step reasoning workloads.',
  },
  imageModel: {
    label: 'Image (editing or generation) model',
    description: 'Generates images from textual descriptions.',
  },
};

export type CapabilityKey = keyof ModelCapabilities;

export const MODEL_CAPABILITY_REQUIREMENTS: Partial<Record<ModelSettingKey, CapabilityKey>> = {
  webSearchModel: 'webSearch',
  reasoningModel: 'reasoning',
  imageModel: 'image',
  visionModel: 'vision',
};

export const CAPABILITY_METADATA: Array<{
  key: CapabilityKey;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    key: 'vision',
    label: 'Vision',
    description: 'Understands and reasons over images.',
    icon: Eye,
  },
  {
    key: 'webSearch',
    label: 'Web search',
    description: 'Can issue web or tool search calls.',
    icon: Globe2,
  },
  {
    key: 'reasoning',
    label: 'Reasoning',
    description: 'Supports extended reasoning budgets.',
    icon: Brain,
  },
  {
    key: 'image',
    label: 'Imaging',
    description: 'Creates images from textual prompts.',
    icon: ImageIcon,
  },
];

export const capabilityKeys: CapabilityKey[] = CAPABILITY_METADATA.map((option) => option.key);

export const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    value: 'openai',
    label: 'OpenAI',
    description: 'Use the public OpenAI API.',
    defaultBaseUrl: 'https://api.openai.com/v1',
    icon: Sparkles,
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    description: 'Connect to Anthropic Claude APIs.',
    defaultBaseUrl: 'https://api.anthropic.com',
    icon: Brain,
  },
  {
    value: 'azure-openai',
    label: 'Azure OpenAI',
    description: 'Azure-hosted OpenAI deployment.',
    defaultBaseUrl: 'https://YOUR_RESOURCE.openai.azure.com',
    icon: Network,
  },
  {
    value: 'ollama',
    label: 'Local (Ollama)',
    description: 'Self-hosted Ollama runtime.',
    defaultBaseUrl: 'http://localhost:11434',
    icon: Server,
  },
  {
    value: 'custom',
    label: 'Custom Provider',
    description: 'Manually specify provider and URL.',
    defaultBaseUrl: '',
    icon: Power,
  },
];

export interface SettingsSectionMeta {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

export type SettingsSectionId = 'general' | 'chatAgent' | 'data';

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: 'general',
    label: 'General Settings',
    description: 'Debugging options and interface theme preferences.',
    icon: Sparkles,
  },
  {
    id: 'chatAgent',
    label: 'Chat Agent Models',
    description: 'Configure models for routing, reasoning, and tool usage.',
    icon: Server,
  },
  {
    id: 'data',
    label: 'Data Management',
    description: 'Export configuration or clear session and history.',
    icon: Trash2,
  },
];

export const getEligibleModelsForSetting = (key: ModelSettingKey, models: ModelConfig[]) => {
  const requiredCapability = MODEL_CAPABILITY_REQUIREMENTS[key];
  if (!requiredCapability) return models;
  return models.filter((model) => model.capabilities[requiredCapability]);
};

export const getCapabilityLabel = (capability: CapabilityKey) =>
  CAPABILITY_METADATA.find((meta) => meta.key === capability)?.label || capability;

export const EMPTY_CAPABILITIES = (): ModelCapabilities => ({
  vision: false,
  webSearch: false,
  reasoning: false,
  image: false,
});

export const createDefaultFormState = (): ModelFormState => ({
  label: '',
  name: '',
  providerPreset: 'openai',
  provider: 'OpenAI',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  capabilities: EMPTY_CAPABILITIES(),
});

export const inferProviderPreset = (model: ModelConfig): ProviderOptionId => {
  const provider = model.provider.toLowerCase();
  const baseUrl = model.baseUrl.toLowerCase();
  if (provider.includes('azure')) return 'azure-openai';
  if (provider.includes('openai')) return 'openai';
  if (provider.includes('anthropic') || baseUrl.includes('anthropic')) return 'anthropic';
  if (provider.includes('ollama') || baseUrl.includes('localhost:11434')) return 'ollama';
  return 'custom';
};

export const maskApiKey = (apiKey: string): string => {
  if (!apiKey) return 'Not set';
  const suffix = apiKey.slice(-4);
  return `**** ${suffix}`;
};

export const getProviderOption = (value: ProviderOptionId) =>
  PROVIDER_OPTIONS.find((option) => option.value === value);

export const createFormStateFromModel = (model: ModelConfig): ModelFormState => {
  const preset = inferProviderPreset(model);
  return {
    label: model.label,
    name: model.name,
    providerPreset: preset,
    provider: model.provider,
    baseUrl: model.baseUrl,
    apiKey: model.apiKey,
    capabilities: { ...model.capabilities },
  };
};

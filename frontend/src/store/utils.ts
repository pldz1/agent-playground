import { ModelConfig, ModelCapabilities, AppSettings, ChatAgentSettings } from '../types';

export const SESSIONS_KEY = 'ai_agent_sessions';
export const SETTINGS_KEY = 'ai_agent_settings';

export const DEFAULT_CAPABILITIES: ModelCapabilities = {
  vision: false,
  webSearch: false,
  reasoning: false,
  image: false,
};

export const defaultSettings: AppSettings = {
  debugMode: false,
  exportFormat: 'json',
  chatAgent: {
    defaultTool: 'chat',
    routingModel: 'gpt-4.1-nano',
    reasoningModel: 'gpt-5.1',
    chatModel: 'gpt-4.1',
    visionModel: 'gpt-4.1',
    webSearchModel: 'gpt-4.1',
    imageModel: 'gpt-image-1',
    chatContextLength: 6,
  },
  models: [],
};

export const cloneModel = (model: ModelConfig): ModelConfig => ({
  ...model,
  capabilities: { ...model.capabilities },
});

export const ensureUniqueLabel = (
  preferredLabel: string,
  used: Set<string>,
  fallbackIndex: number,
): string => {
  const base = preferredLabel.trim() || `model-${fallbackIndex + 1}`;
  let candidate = base;
  let attempt = 1;
  while (!candidate || used.has(candidate)) {
    candidate = `${base}-${attempt++}`;
  }
  used.add(candidate);
  return candidate;
};

export const normalizeCapabilities = (value: unknown): ModelCapabilities => ({
  vision: Boolean((value as ModelCapabilities | undefined)?.vision),
  webSearch: Boolean((value as ModelCapabilities | undefined)?.webSearch),
  reasoning: Boolean((value as ModelCapabilities | undefined)?.reasoning),
  image: Boolean((value as ModelCapabilities | undefined)?.image),
});

export const normalizeModel = (
  model: unknown,
  used: Set<string>,
  index: number,
): ModelConfig | null => {
  if (model == null) return null;

  if (typeof model === 'string') {
    const name = model.trim();
    if (!name) return null;
    const label = ensureUniqueLabel(name, used, index);
    return {
      label,
      name,
      provider: '',
      baseUrl: '',
      apiKey: '',
      capabilities: { ...DEFAULT_CAPABILITIES },
    };
  }

  if (typeof model === 'object') {
    const source = model as Partial<ModelConfig> & Record<string, unknown>;
    const rawName = typeof source.name === 'string' ? source.name.trim() : '';
    const rawLabel = typeof source.label === 'string' ? source.label.trim() : '';
    const label = ensureUniqueLabel(rawLabel, used, index);

    const provider = typeof source.provider === 'string' ? source.provider.trim() : '';
    const baseUrl = typeof source.baseUrl === 'string' ? source.baseUrl.trim() : '';
    const apiKey = typeof source.apiKey === 'string' ? source.apiKey.trim() : '';

    return {
      label,
      name: rawName,
      provider,
      baseUrl,
      apiKey,
      capabilities: normalizeCapabilities(source.capabilities),
    };
  }

  return null;
};

export const normalizeModels = (input: unknown, fallback: ModelConfig[]): ModelConfig[] => {
  if (!Array.isArray(input)) return fallback.map(cloneModel);

  const usedIds = new Set<string>();
  const normalized = input
    .map((model, index) => normalizeModel(model, usedIds, index))
    .filter((model): model is ModelConfig => Boolean(model));

  return normalized.length > 0 ? normalized : fallback.map(cloneModel);
};

export const normalizeSettings = (raw: unknown, base: AppSettings): AppSettings => {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<AppSettings> & {
    availableModels?: unknown;
    chatAgent?: unknown;
  };

  const chatAgentSource =
    typeof source.chatAgent === 'object' && source.chatAgent !== null
      ? (source.chatAgent as Partial<ChatAgentSettings>)
      : (source as Partial<ChatAgentSettings>);

  const models = normalizeModels(source.models ?? source.availableModels, base.models);
  const fallbackModelLabel = models[0]?.label ?? '';

  const pickModel = (value: unknown, defaultValue: string): string => {
    const candidate = typeof value === 'string' ? value.trim() : '';
    if (candidate && models.some((model) => model.label === candidate)) return candidate;
    if (models.some((model) => model.label === defaultValue)) return defaultValue;
    return fallbackModelLabel;
  };

  const parseContextLength = (value: unknown, fallback: number): number => {
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number.parseInt(value, 10)
          : Number.NaN;
    if (Number.isNaN(parsed) || parsed < 0) return fallback;
    return Math.min(parsed, 50);
  };

  const parseDefaultTool = (
    value: unknown,
    fallback: AppSettings['chatAgent']['defaultTool'],
  ): AppSettings['chatAgent']['defaultTool'] => {
    const candidate = typeof value === 'string' ? value : '';
    const allowedTools: AppSettings['chatAgent']['defaultTool'][] = [
      'auto',
      'chat',
      'chat_with_image',
      'reasoning',
      'web_search',
      'image_generate',
    ];
    if (allowedTools.includes(candidate as AppSettings['chatAgent']['defaultTool'])) {
      return candidate as AppSettings['chatAgent']['defaultTool'];
    }
    return fallback;
  };

  return {
    debugMode: Boolean(source.debugMode ?? base.debugMode),
    exportFormat: source.exportFormat === 'markdown' ? 'markdown' : base.exportFormat,
    chatAgent: {
      defaultTool: parseDefaultTool(chatAgentSource.defaultTool, base.chatAgent.defaultTool),
      routingModel: pickModel(chatAgentSource.routingModel, base.chatAgent.routingModel),
      reasoningModel: pickModel(chatAgentSource.reasoningModel, base.chatAgent.reasoningModel),
      chatModel: pickModel(chatAgentSource.chatModel, base.chatAgent.chatModel),
      webSearchModel: pickModel(chatAgentSource.webSearchModel, base.chatAgent.webSearchModel),
      imageModel: pickModel(chatAgentSource.imageModel, base.chatAgent.imageModel),
      visionModel: pickModel(chatAgentSource.visionModel, base.chatAgent.visionModel),
      chatContextLength: parseContextLength(
        chatAgentSource.chatContextLength,
        base.chatAgent.chatContextLength,
      ),
    },
    models,
  };
};

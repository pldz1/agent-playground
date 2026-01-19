import type { AppSettings, ModelConfig, ModelRole } from "@/types";
import { getSettings, defaultSettings } from "@/store";

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

const EMPTY_MODEL: ModelConfig = {
  label: "",
  name: "",
  provider: "",
  baseUrl: "",
  apiKey: "",
  capabilities: {
    vision: false,
    webSearch: false,
    reasoning: false,
    image: false,
  },
};

function safeGetSettings(): AppSettings {
  try {
    return getSettings();
  } catch {
    return defaultSettings;
  }
}

function selectModelName(settings: AppSettings, role: ModelRole): string {
  switch (role) {
    case "chat":
      return settings.chatModel;
    case "vision":
      return settings.visionModel;
    case "webSearch":
      return settings.webSearchModel;
    case "reasoning":
      return settings.reasoningModel;
    case "routing":
      return settings.routingModel;
    case "image":
      return settings.imageModel;
    default:
      return settings.chatModel;
  }
}

function findModel(
  settings: AppSettings,
  label: string
): ModelConfig | undefined {
  if (!label) return undefined;
  return settings.models.find((model) => model.label === label);
}

function fallbackModel(role: ModelRole): ModelConfig | null {
  const fallbackId = selectModelName(defaultSettings, role);
  return (
    findModel(defaultSettings, fallbackId) ?? defaultSettings.models[0] ?? null
  );
}

function toRuntimeModel(model: ModelConfig): RuntimeModel {
  return {
    label: model.label,
    name: model.name,
    provider: model.provider,
    baseUrl: model.baseUrl,
    apiKey: model.apiKey,
  };
}

export function resolveModel(role: ModelRole): {
  modelName: string;
  model: RuntimeModel;
  settings: AppSettings;
} {
  const settings = safeGetSettings();
  const selectedId = selectModelName(settings, role);
  const match = findModel(settings, selectedId);
  const target = match ?? fallbackModel(role) ?? EMPTY_MODEL;
  return {
    modelName: target.name,
    model: toRuntimeModel(target),
    settings,
  };
}

export function resolveAuth(role: ModelRole): RuntimeAuthConfig {
  const { modelName, model } = resolveModel(role);
  const baseUrl = normalizeBaseUrl(model.baseUrl || "");
  const apiKey = model.apiKey || "";

  return {
    role,
    modelName,
    model,
    apiKey,
    baseUrl,
    apiVersion: "",
  };
}

export function assertAuth(role: ModelRole): void {
  const auth = resolveAuth(role);
  const missing: string[] = [];
  if (!auth.apiKey) missing.push("API key");
  if (!auth.baseUrl) missing.push("base URL");

  if (missing.length) {
    const providerInfo = auth.model.provider
      ? ` for provider "${auth.model.provider}"`
      : "";
    throw new Error(
      `Missing ${missing.join(
        " and "
      )}${providerInfo} in settings for role "${role}". ` +
        `Please configure it in Settings > Models.`
    );
  }
}

function normalizeBaseUrl(value: string): string {
  if (!value) return value;
  return value.replace(/\/+$/, "");
}

export const config = {
  resolveModel,
  resolveAuth,
  assertAuth,
};

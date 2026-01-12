import type { AppSettings, ModelConfig } from "@/types";
import { getSettings, defaultSettings } from "@/store";

export type ModelRole = "chat" | "reasoning" | "router" | "image";

export interface RuntimeModel {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
}

export interface RuntimeAuthConfig {
  role: ModelRole;
  modelId: string;
  model: RuntimeModel;
  apiKey: string;
  baseUrl: string;
  apiVersion: string;
}

const EMPTY_MODEL: ModelConfig = {
  id: "",
  name: "",
  provider: "",
  baseUrl: "",
  apiKey: "",
  capabilities: {
    vision: false,
    webSearch: false,
    reasoning: false,
    imageGeneration: false,
  },
};

function safeGetSettings(): AppSettings {
  try {
    return getSettings();
  } catch {
    return defaultSettings;
  }
}

function selectModelId(settings: AppSettings, role: ModelRole): string {
  switch (role) {
    case "chat":
      return settings.chatModel;
    case "reasoning":
      return settings.reasoningModel;
    case "router":
      return settings.routingModel;
    case "image":
      return (
        settings.models.find((model) => model.capabilities.imageGeneration)
          ?.id ?? settings.chatModel
      );
    default:
      return settings.chatModel;
  }
}

function findModel(settings: AppSettings, id: string): ModelConfig | undefined {
  if (!id) return undefined;
  return settings.models.find((model) => model.id === id);
}

function fallbackModel(role: ModelRole): ModelConfig | null {
  const fallbackId = selectModelId(defaultSettings, role);
  return (
    findModel(defaultSettings, fallbackId) ?? defaultSettings.models[0] ?? null
  );
}

function toRuntimeModel(model: ModelConfig): RuntimeModel {
  return {
    id: model.id,
    name: model.name,
    provider: model.provider,
    baseUrl: model.baseUrl,
    apiKey: model.apiKey,
  };
}

export function resolveModel(role: ModelRole): {
  modelId: string;
  model: RuntimeModel;
  settings: AppSettings;
} {
  const settings = safeGetSettings();
  const selectedId = selectModelId(settings, role);
  const match = findModel(settings, selectedId);
  const target = match ?? fallbackModel(role) ?? EMPTY_MODEL;
  return {
    modelId: target.id,
    model: toRuntimeModel(target),
    settings,
  };
}

export function resolveAuth(role: ModelRole): RuntimeAuthConfig {
  const { modelId, model } = resolveModel(role);
  const baseUrl = normalizeBaseUrl(model.baseUrl || "");
  const apiKey = model.apiKey || "";

  return {
    role,
    modelId,
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

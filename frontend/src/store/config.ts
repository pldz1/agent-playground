import {
  AppSettings,
  ModelConfigIssue,
  ModelConfigStatus,
  ModelRole,
} from "../types";

const ROLE_META: Record<
  ModelRole,
  { roleLabel: string; select: (settings: AppSettings) => string }
> = {
  routing: {
    roleLabel: "Routing model",
    select: (settings) => settings.routingModel,
  },
  chat: { roleLabel: "Chat model", select: (settings) => settings.chatModel },
  vision: {
    roleLabel: "Vision model",
    select: (settings) => settings.visionModel,
  },
  reasoning: {
    roleLabel: "Reasoning model",
    select: (settings) => settings.reasoningModel,
  },
  webSearch: {
    roleLabel: "Web search model",
    select: (settings) => settings.webSearchModel,
  },
  image: {
    roleLabel: "Image generation model",
    select: (settings) => settings.imageModel,
  },
};

const REQUIRED_ROLES: ModelRole[] = ["chat", "routing"];

export const modelConfig = (settings: AppSettings): ModelConfigStatus => {
  const issues: ModelConfigIssue[] = [];
  const findModel = (label: string | null | undefined) =>
    label
      ? settings.models.find((model) => model.label === label) ?? null
      : null;

  (Object.keys(ROLE_META) as ModelRole[]).forEach((role) => {
    const { roleLabel, select } = ROLE_META[role];
    const selectedId = select(settings) || null;
    const model = findModel(selectedId);

    const modelBase = model?.baseUrl?.trim() ?? "";
    const modelKey = model?.apiKey?.trim() ?? "";

    const missingBaseUrl = modelBase.length === 0;
    const missingApiKey = modelKey.length === 0;

    if (!model || missingBaseUrl || missingApiKey) {
      issues.push({
        role,
        roleLabel,
        modelLabel: model?.label ?? selectedId,
        modelName: model?.name ?? null,
        missingApiKey: !model || missingApiKey,
        missingBaseUrl: !model || missingBaseUrl,
      });
    }
  });

  const configured = REQUIRED_ROLES.every(
    (role) => !issues.some((issue) => issue.role === role)
  );

  return { configured, issues };
};

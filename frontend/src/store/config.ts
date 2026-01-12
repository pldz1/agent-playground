import {
  AppSettings,
  ModelConfigIssue,
  ModelConfigStatus,
  ModelRole,
} from "../types";

const ROLE_META: Record<
  ModelRole,
  { label: string; select: (settings: AppSettings) => string }
> = {
  chat: { label: "Chat model", select: (settings) => settings.chatModel },
  reasoning: {
    label: "Reasoning model",
    select: (settings) => settings.reasoningModel,
  },
  router: {
    label: "Routing model",
    select: (settings) => settings.routingModel,
  },
};

export const modelConfig = (settings: AppSettings): ModelConfigStatus => {
  const issues: ModelConfigIssue[] = [];
  const findModel = (id: string | null | undefined) =>
    id ? settings.models.find((model) => model.id === id) ?? null : null;

  (Object.keys(ROLE_META) as ModelRole[]).forEach((role) => {
    const { label, select } = ROLE_META[role];
    const selectedId = select(settings) || null;
    const model = findModel(selectedId);

    const modelBase = model?.baseUrl?.trim() ?? "";
    const modelKey = model?.apiKey?.trim() ?? "";

    const missingBaseUrl = modelBase.length === 0;
    const missingApiKey = modelKey.length === 0;

    if (!model || missingBaseUrl || missingApiKey) {
      issues.push({
        role,
        label,
        modelId: model?.id ?? selectedId,
        modelName: model?.name ?? null,
        missingApiKey: !model || missingApiKey,
        missingBaseUrl: !model || missingBaseUrl,
      });
    }
  });

  return { configured: issues.length === 0, issues };
};

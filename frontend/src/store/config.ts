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
  chat: { roleLabel: "Chat model", select: (settings) => settings.chatModel },
  reasoning: {
    roleLabel: "Reasoning model",
    select: (settings) => settings.reasoningModel,
  },
  router: {
    roleLabel: "Routing model",
    select: (settings) => settings.routingModel,
  },
};

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

  return { configured: issues.length === 0, issues };
};

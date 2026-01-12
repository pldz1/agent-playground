import { resolveAuth } from "./config";
import { logger } from "./logger";
import { routerPrompt } from "./prompts/routerPrompt";
import { getOpenAIClient } from "./tools/openaiClient";
import type { IntentName } from "./executor";

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeRoute(route: any): IntentName[] {
  const allowed = new Set<IntentName>([
    "chat",
    "web_search",
    "reasoning",
    "image_generate",
    "image_understand",
  ]);

  const intents =
    Array.isArray(route?.intents) && route.intents.length
      ? route.intents
      : route?.intent
      ? [route.intent]
      : [];

  const cleaned = intents
    .map((x: any) => String(x || "").trim())
    .filter((x: any) => allowed.has(x));

  return cleaned.length ? (cleaned as IntentName[]) : ["chat"];
}

export async function route({
  input,
  hasImage = false,
}: {
  input: string;
  hasImage?: boolean;
}): Promise<{
  intents: IntentName[];
  raw: any;
  model: string;
  mocked: boolean;
}> {
  if (hasImage) {
    return {
      intents: ["image_understand"],
      raw: { intent: "image_understand" },
      model: "heuristic",
      mocked: false,
    };
  }

  const auth = resolveAuth("router");
  const client = getOpenAIClient(auth);
  const modelId = auth.modelId;
  const started = now();

  logger.debug("Router.route:start", {
    modelId,
    provider: auth.model.provider,
  });

  try {
    const completion = await client.agent.completions.create({
      model: modelId,
      temperature: 0,
      messages: [
        { role: "system", content: routerPrompt },
        { role: "user", content: input },
      ],
      response_format: { type: "json_object" },
    });

    const duration = Math.round(now() - started);
    logger.debug("Router.route:success", {
      modelId,
      durationMs: duration,
    });

    const text = completion.choices?.[0]?.message?.content ?? "{}";
    const parsed = safeJsonParse(text) || {};
    const intents = normalizeRoute(parsed);

    return {
      intents,
      raw: parsed,
      model: modelId,
      mocked: false,
    };
  } catch (error) {
    logger.error("Router.route:error", {
      modelId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

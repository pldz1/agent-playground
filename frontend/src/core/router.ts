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
    "webSearch",
    "reasoning",
    "image_generate",
    "image_understand",
  ]);

  const intents =
    Array.isArray(route?.intents) && route.intents.length ? route.intents : [];

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
}> {
  if (hasImage) {
    return {
      intents: ["image_understand"],
      raw: { intents: "image_understand" },
      model: "heuristic",
    };
  }

  const auth = resolveAuth("routing");
  const client = getOpenAIClient(auth);
  const modelName = auth.modelName;
  const started = now();

  logger.debug("Router.route:start", {
    modelName,
    provider: auth.model.provider,
  });

  try {
    const completion = await client.agent.completions.create({
      model: modelName,
      temperature: 0,
      messages: [
        { role: "system", content: routerPrompt },
        { role: "user", content: input },
      ],
      response_format: { type: "json_object" },
    });

    const duration = Math.round(now() - started);
    logger.debug("Router.route:success", {
      modelName,
      durationMs: duration,
    });

    const text = completion.choices?.[0]?.message?.content ?? "{}";
    const parsed = safeJsonParse(text) || {};
    const intents = normalizeRoute(parsed);

    return {
      intents,
      raw: parsed,
      model: modelName,
    };
  } catch (error) {
    logger.error("Router.route:error", {
      modelName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

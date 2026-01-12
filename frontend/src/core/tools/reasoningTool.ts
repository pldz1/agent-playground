import { resolveAuth } from "../config";
import { logger } from "../logger";
import { reasoningPrompt } from "../prompts/reasoningPrompt";
import { getOpenAIClient } from "./openaiClient";

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export class ReasoningTool {
  async think({
    input,
    context,
    model,
  }: {
    input: string;
    context?: any;
    model?: string;
  }) {
    const auth = resolveAuth("reasoning");
    const client = getOpenAIClient(auth);
    const modelId = model ?? auth.modelId;
    const started = now();

    logger.debug("ReasoningTool.think:start", {
      modelId,
      provider: auth.model.provider,
    });

    try {
      const completion = await client.agent.completions.create({
        messages: [
          { role: "system", content: reasoningPrompt },
          {
            role: "user",
            content: `user: ${input}\ncontext: ${context ? JSON.stringify(context) : "null"}`,
          },
        ],
        model: modelId,
        reasoning_effort: "medium",
      });

      const duration = Math.round(now() - started);
      logger.debug("ReasoningTool.think:success", {
        modelId,
        durationMs: duration,
      });

      return {
        mocked: false,
        text: completion.choices?.[0]?.message?.content ?? "",
        choice: completion.choices?.[0],
      };
    } catch (error) {
      logger.error("ReasoningTool.think:error", {
        modelId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

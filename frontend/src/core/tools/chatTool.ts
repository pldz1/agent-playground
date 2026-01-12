import { resolveAuth } from "../config";
import { logger } from "../logger";
import { getOpenAIClient } from "./openaiClient";

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export class ChatTool {
  /**
   * ChatTool: fast, low-cost conversation.
   * No routing/decision logic here.
   */
  async reply({
    input,
    context,
    model,
  }: {
    input: string;
    context?: any;
    model?: string;
  }) {
    const auth = resolveAuth("chat");
    const client = getOpenAIClient(auth);
    const modelId = model ?? auth.modelId;
    const started = now();

    logger.debug("ChatTool.reply:start", {
      modelId,
      provider: auth.model.provider,
    });

    const messages: { role: "user" | "system"; content: string }[] = [
      { role: "user", content: input },
    ];

    if (context) {
      messages.unshift({
        role: "system",
        content: `Context (web search results, if any):\n${JSON.stringify(
          context
        )}`,
      });
    }

    try {
      const completion = await client.agent.completions.create({
        messages,
        model: modelId,
      });

      const duration = Math.round(now() - started);
      logger.debug("ChatTool.reply:success", {
        modelId,
        durationMs: duration,
      });

      return {
        mocked: false,
        text: completion.choices?.[0]?.message?.content ?? "",
        choice: completion.choices?.[0],
      };
    } catch (error) {
      logger.error("ChatTool.reply:error", {
        modelId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

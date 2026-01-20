import { resolveAuth } from "../config";
import { logger } from "../logger";
import { getOpenAIClient } from "./openaiClient";
import type { AgentHistoryMessage } from "@/types";

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
    history,
  }: {
    input: string;
    context?: any;
    model?: string;
    history?: AgentHistoryMessage[];
  }) {
    const auth = resolveAuth("chat");
    const client = getOpenAIClient(auth);
    const modelName = model ?? auth.modelName;
    const started = now();

    logger.debug("ChatTool.reply:start", {
      modelName,
      provider: auth.model.provider,
    });

    const messages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [];

    if (context) {
      messages.push({
        role: "system",
        content: `Context (web search results, if any):\n${JSON.stringify(
          context
        )}`,
      });
    }

    if (Array.isArray(history) && history.length > 0) {
      history
        .filter(
          (entry): entry is AgentHistoryMessage =>
            Boolean(entry?.content) && (entry?.role === "user" || entry?.role === "assistant")
        )
        .forEach((entry) => {
          messages.push({
            role: entry.role,
            content: entry.content,
          });
        });
    }

    messages.push({ role: "user", content: input });

    try {
      const completion = await client.agent.completions.create({
        messages,
        model: modelName,
      });

      const duration = Math.round(now() - started);
      logger.debug("ChatTool.reply:success", {
        modelName,
        durationMs: duration,
      });

      return {
        text: completion.choices?.[0]?.message?.content ?? "",
        choice: completion.choices?.[0],
      };
    } catch (error) {
      logger.error("ChatTool.reply:error", {
        modelName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

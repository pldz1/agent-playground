import { resolveAuth } from "../config";
import { logger } from "../logger";
import { getOpenAIClient } from "./openaiClient";

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export class WebSearchTool {
  async search({ model, input }: { model?: string; input: string }) {
    const auth = resolveAuth("reasoning");
    const client = getOpenAIClient(auth);
    const modelId = model ?? auth.modelId;
    const started = now();

    logger.debug("WebSearchTool.search:start", {
      modelId,
      provider: auth.model.provider,
    });

    try {
      const response = await client.responses.create({
        model: modelId,
        tools: [{ type: "web_search_preview" }],
        input,
      });

      const duration = Math.round(now() - started);
      logger.debug("WebSearchTool.search:success", {
        modelId,
        durationMs: duration,
      });

      return {
        mocked: false,
        query: input,
        output_text: response.output_text,
        response,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("WebSearchTool.search:error", {
        modelId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

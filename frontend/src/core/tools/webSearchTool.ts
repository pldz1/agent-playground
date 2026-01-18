import { resolveAuth } from "../config";
import { logger } from "../logger";
import { getOpenAIClient } from "./openaiClient";

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export class WebSearchTool {
  async search({ model, input }: { model?: string; input: string }) {
    const auth = resolveAuth("reasoning");
    const client = getOpenAIClient(auth);
    const modelName = model ?? auth.modelName;
    const started = now();

    logger.debug("WebSearchTool.search:start", {
      modelName,
      provider: auth.model.provider,
    });

    try {
      const response = await client.responses.create({
        model: modelName,
        tools: [{ type: "web_search_preview" }],
        input,
      });

      const duration = Math.round(now() - started);
      logger.debug("WebSearchTool.search:success", {
        modelName,
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
        modelName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

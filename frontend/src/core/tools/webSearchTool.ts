import { resolveAuth } from '../config';
import { logger } from '../logger';
import { getOpenAIClient } from './openaiClient';
import { AgentHistoryMessage, ToolRunResult } from '@/types';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export type WebSearchToolInput = { model?: string; input: string; history?: AgentHistoryMessage[] };

export class WebSearchTool {
  async search({ model, input }: WebSearchToolInput): Promise<ToolRunResult> {
    const auth = resolveAuth('webSearch');
    const client = getOpenAIClient(auth);
    const modelName = model ?? auth.modelName;
    const started = now();

    logger.debug('WebSearchTool.search:start', {
      modelName,
      provider: auth.model.provider,
    });

    try {
      const response = await client.responses.create({
        model: modelName,
        tools: [{ type: 'web_search_preview' }],
        input,
      });

      const duration = Math.round(now() - started);
      logger.debug('WebSearchTool.search:success', {
        modelName,
        durationMs: duration,
      });

      return {
        text: response.output[1].content[0].text,
        raw: response,
      };
    } catch (error) {
      logger.error('WebSearchTool.search:error', {
        modelName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

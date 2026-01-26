import { resolveAuth } from '../chat/config';
import { logger } from '../logger';
import { reasoningPrompt } from '../prompts/reasoningPrompt';
import { getOpenAIClient } from './openaiClient';
import { ChatAgentHistoryMessage, ChatAgentToolRunResult } from '@/types';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export type ReasoningToolInput = {
  input: string;
  model?: string;
  history?: ChatAgentHistoryMessage[];
};

export class ReasoningTool {
  async think({ input, model }: ReasoningToolInput): Promise<ChatAgentToolRunResult> {
    const auth = resolveAuth('reasoning');
    const client = getOpenAIClient(auth);
    const modelName = model ?? auth.modelName;
    const started = now();

    logger.debug('ReasoningTool.think:start', {
      modelName,
      provider: auth.model.provider,
    });

    try {
      const response = await client.agent.completions.create({
        messages: [
          { role: 'system', content: reasoningPrompt },
          { role: 'user', content: input },
        ],
        model: modelName,
        reasoning_effort: 'medium',
      });

      const duration = Math.round(now() - started);
      logger.debug('ReasoningTool.think:success', {
        modelName,
        durationMs: duration,
      });

      return {
        text: response.choices?.[0]?.message?.content ?? '',
        raw: response,
      };
    } catch (error) {
      logger.error('ReasoningTool.think:error', {
        modelName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

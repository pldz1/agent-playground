import { resolveAuth } from '../chat/config';
import { logger } from '../logger';
import { getOpenAIClient } from './openaiClient';
import type { ChatAgentHistoryMessage, ChatAgentToolRunResult } from '@/types';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export type ChatToolInput = {
  input: string;
  model?: string;
  history?: ChatAgentHistoryMessage[];
};

/**
 * ChatTool: fast, low-cost conversation.
 * No routing/decision logic here.
 */
export class ChatTool {
  async reply({ input, model, history }: ChatToolInput): Promise<ChatAgentToolRunResult> {
    const auth = resolveAuth('chat');
    const client = getOpenAIClient(auth);
    const modelName = model ?? auth.modelName;
    const started = now();

    logger.debug('ChatTool.reply:start', {
      modelName,
      provider: auth.model.provider,
    });

    const messages: {
      role: 'system' | 'user' | 'assistant';
      content: string;
    }[] = [];

    if (Array.isArray(history) && history.length > 0) {
      history
        .filter(
          (entry): entry is ChatAgentHistoryMessage =>
            Boolean(entry?.content) && (entry?.role === 'user' || entry?.role === 'assistant'),
        )
        .forEach((entry) => {
          messages.push({
            role: entry.role,
            content: entry.content,
          });
        });
    }

    messages.push({ role: 'user', content: input });

    try {
      const response = await client.agent.completions.create({
        messages,
        model: modelName,
      });

      const duration = Math.round(now() - started);
      logger.debug('ChatTool.reply:success', {
        modelName,
        durationMs: duration,
      });

      return {
        text: response.choices?.[0]?.message?.content ?? '',
        raw: response,
      };
    } catch (error) {
      logger.error('ChatTool.reply:error', {
        modelName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

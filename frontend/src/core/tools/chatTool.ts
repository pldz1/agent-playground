import { resolveAuth } from '../chat/config';
import { logger } from '../logger';
import { getOpenAIClient } from './openaiClient';
import type {
  ChatAgentHistoryMessage,
  ChatAgentImageInput,
  ChatAgentImageInputPayload,
  ChatAgentToolRunResult,
} from '@/types';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export type ChatToolInput = {
  input: string;
  model?: string;
  history?: ChatAgentHistoryMessage[];
  image?: ChatAgentImageInputPayload;
};

type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

/**
 * ChatTool: fast, low-cost conversation.
 * No routing/decision logic here.
 */
export class ChatTool {
  async reply({ input, model, history, image }: ChatToolInput): Promise<ChatAgentToolRunResult> {
    const images: ChatAgentImageInput[] = Array.isArray(image)
      ? image
      : image
        ? [image]
        : [];
    const hasImage = images.some((entry) => Boolean(entry?.data || entry?.url));
    const auth = resolveAuth(hasImage ? 'vision' : 'chat');
    const client = getOpenAIClient(auth);
    const modelName = model ?? auth.modelName;
    const started = now();

    logger.debug('ChatTool.reply:start', {
      modelName,
      provider: auth.model.provider,
    });

    const messages: {
      role: 'system' | 'user' | 'assistant';
      content: string | ContentPart[];
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

    const imageContents = images
      .map((entry) => {
        if (entry.url) {
          return { type: 'image_url', image_url: { url: entry.url } } as const;
        }
        if (entry.data) {
          return {
            type: 'image_url',
            image_url: { url: `data:${entry.mimeType || 'image/png'};base64,${entry.data}` },
          } as const;
        }
        return null;
      })
      .filter((item): item is ContentPart => Boolean(item));

    const content: string | ContentPart[] = imageContents.length
      ? [{ type: 'text', text: input }, ...imageContents]
      : input;

    messages.push({ role: 'user', content });

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

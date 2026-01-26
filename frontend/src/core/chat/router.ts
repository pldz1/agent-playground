import { resolveAuth } from './config';
import { logger } from '../logger';
import { routerPrompt } from '../prompts/routerPrompt';
import { getOpenAIClient } from '../tools/openaiClient';
import type { ChatAgentIntentName, ChatAgentRouteResult } from '@/types';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeRoute(route: unknown): ChatAgentIntentName[] {
  const allowed = new Set<ChatAgentIntentName>([
    'chat',
    'webSearch',
    'reasoning',
    'image_generate',
    'image_understand',
  ]);

  const intents =
    typeof route === 'object' && route && 'intents' in route
      ? (route as { intents?: unknown }).intents
      : undefined;

  const rawIntents = Array.isArray(intents) && intents.length ? intents : [];

  const cleaned = rawIntents
    .map((value) => String(value || '').trim())
    .filter((value): value is ChatAgentIntentName => allowed.has(value as ChatAgentIntentName));

  return cleaned.length ? cleaned : ['chat'];
}

export async function route({
  input,
  hasImage = false,
}: {
  input: string;
  hasImage?: boolean;
}): Promise<ChatAgentRouteResult> {
  if (hasImage) {
    return {
      intents: ['image_understand'],
      raw: { intents: 'image_understand' },
      model: 'heuristic',
    };
  }

  const auth = resolveAuth('routing');
  const client = getOpenAIClient(auth);
  const modelName = auth.modelName;
  const started = now();

  logger.debug('Router.route:start', {
    modelName,
    provider: auth.model.provider,
  });

  try {
    const completion = await client.agent.completions.create({
      model: modelName,
      temperature: 0,
      messages: [
        { role: 'system', content: routerPrompt },
        { role: 'user', content: input },
      ],
      response_format: { type: 'json_object' },
    });

    const duration = Math.round(now() - started);
    logger.debug('Router.route:success', {
      modelName,
      durationMs: duration,
    });

    const text = completion.choices?.[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse(text);
    const normalizedPayload = parsed ?? {};
    const intents = normalizeRoute(normalizedPayload);

    return {
      intents,
      raw: normalizedPayload,
      model: modelName,
    };
  } catch (error) {
    logger.error('Router.route:error', {
      modelName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

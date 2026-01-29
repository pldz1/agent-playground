import type { ChatAgentIntentName, ChatAgentPlanName, ChatAgentToolName } from '@/types';

const INTENT_ALIASES: Record<string, ChatAgentIntentName> = {
  chat: 'chat',
  webSearch: 'web_search',
  web_search: 'web_search',
  chat_with_image: 'chat_with_image',
  reasoning: 'reasoning',
  image_generate: 'image_generate',
};

export const normalizeIntentName = (value: unknown): ChatAgentIntentName | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return INTENT_ALIASES[trimmed] ?? null;
};

export const toPlanName = (intent: ChatAgentIntentName): ChatAgentPlanName => `${intent}_plan`;

export const toToolName = (intent: ChatAgentIntentName): ChatAgentToolName => `${intent}_tool`;

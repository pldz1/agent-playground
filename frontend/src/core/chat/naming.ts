import type { ChatAgentIntentName, ChatAgentPlanName, ChatAgentToolName } from '@/types';

const INTENT_ALIASES: Record<string, ChatAgentIntentName> = {
  chat: 'chat',
  webSearch: 'web_search',
  web_search: 'web_search',
  reasoning: 'reasoning',
  image_generate: 'image_generate',
  image_understand: 'image_understand',
};

export const normalizeIntentName = (value: unknown): ChatAgentIntentName | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return INTENT_ALIASES[trimmed] ?? null;
};

export const toPlanName = (intent: ChatAgentIntentName): ChatAgentPlanName =>
  `${intent}_plan`;

export const toToolName = (intent: ChatAgentIntentName): ChatAgentToolName =>
  `${intent}_tool`;

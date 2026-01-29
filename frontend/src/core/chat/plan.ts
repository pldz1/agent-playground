import type {
  ChatAgentIntentName,
  ChatAgentPlanProgressStep,
  ChatAgentPlanStep,
} from '@/types';
import { normalizeIntentName, toPlanName } from './naming';

const PLAN_DESCRIPTIONS: Record<ChatAgentIntentName, string> = {
  chat: 'Chat message response',
  reasoning: 'Deep reasoning analysis',
  web_search: 'Perform web search',
  image_generate: 'Generate image',
  image_understand: 'Understand image content',
};

export function normalizePlan(intents: Array<ChatAgentIntentName | string> = []): ChatAgentIntentName[] {
  const unique: ChatAgentIntentName[] = [];
  for (const intent of intents) {
    const normalized = normalizeIntentName(intent);
    if (normalized && !unique.includes(normalized)) unique.push(normalized);
  }

  if (!unique.length) unique.push('chat');
  return unique;
}

export function buildPlanProgressSteps(plan: ChatAgentIntentName[]): ChatAgentPlanProgressStep[] {
  return plan.map((tool, index) => ({
    id: `step-${index}`,
    tool: toPlanName(tool),
  }));
}

export function buildPlanSteps(plan: ChatAgentIntentName[] = []): ChatAgentPlanStep[] {
  return plan.map((tool, index) => ({
    id: `step-${index}`,
    tool: toPlanName(tool),
    description: PLAN_DESCRIPTIONS[tool] ?? tool,
  }));
}

import type { ChatAgentIntentName, ChatAgentPlanProgressStep, ChatAgentPlanStep } from '@/types';

const PLAN_DESCRIPTIONS: Record<ChatAgentIntentName, string> = {
  chat: 'Chat message response',
  reasoning: 'Deep reasoning analysis',
  webSearch: 'Perform web search',
  image_generate: 'Generate image',
  image_understand: 'Understand image content',
};

export function normalizePlan(intents: ChatAgentIntentName[] = []): ChatAgentIntentName[] {
  const unique: ChatAgentIntentName[] = [];
  for (const intent of intents) {
    if (!unique.includes(intent)) unique.push(intent);
  }

  if (!unique.length) unique.push('chat');
  return unique;
}

export function buildPlanProgressSteps(plan: ChatAgentIntentName[]): ChatAgentPlanProgressStep[] {
  return plan.map((tool, index) => ({
    id: `step-${index}`,
    tool,
  }));
}

export function buildPlanSteps(plan: ChatAgentIntentName[] = []): ChatAgentPlanStep[] {
  return plan.map((tool, index) => ({
    id: `step-${index}`,
    tool,
    description: PLAN_DESCRIPTIONS[tool] ?? tool,
  }));
}

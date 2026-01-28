import type {
  ChatAgentImageInput,
  ChatAgentInput,
  ChatAgentIntentName,
  ChatAgentCoreHandleInput,
  ChatAgentCoreHandleOutput,
  ChatAgentOutput,
  ChatAgentPlanStep,
  ChatAgentToolName,
  ChatAgentToolOutput,
  ChatAgentToolOutputInput,
  ChatAgentToolRunOutput,
  InlineImageExtraction,
} from '@/types';

import { route } from './router';
import { Executor } from './executor';

const PLAN_DESCRIPTIONS: Record<ChatAgentIntentName, string> = {
  chat: 'Chat message response',
  reasoning: 'Deep reasoning analysis',
  webSearch: 'Perform web search',
  image_generate: 'Generate image',
  image_understand: 'Understand image content',
};

function toPlan(plan: ChatAgentIntentName[] = []): ChatAgentPlanStep[] {
  return plan.map((tool, index) => ({
    id: `step-${index}`,
    tool,
    description: PLAN_DESCRIPTIONS[tool] ?? tool,
  }));
}

function normalizeIntents(intents: ChatAgentIntentName[] = []): ChatAgentIntentName[] {
  const unique: ChatAgentIntentName[] = [];
  for (const intent of intents) {
    if (!unique.includes(intent)) unique.push(intent);
  }
  if (!unique.length) unique.push('chat');
  return unique;
}

function toToolOutput({ output, index }: ChatAgentToolOutputInput): ChatAgentToolOutput {
  const base: Pick<ChatAgentToolOutput, 'stepId' | 'tool' | 'duration'> = {
    stepId: `step-${index}`,
    tool: output.step as ChatAgentToolName,
    duration: output.duration,
  };

  if ('error' in output) {
    return {
      ...base,
      status: 'fail',
      data: null,
      error: output.error,
    };
  }
  return {
    ...base,
    status: 'success',
    data: output,
  };
}

function pickFinalAnswer(outputs: ChatAgentToolRunOutput[]): string {
  if (!outputs.length) return '';

  for (let i = outputs.length - 1; i >= 0; i -= 1) {
    const current = outputs[i];

    if ('error' in current) {
      return current.error;
    }

    if (current.step === 'chat' && current.result?.text) {
      return current.result.text;
    }

    if (current.step === 'reasoning' && current.result?.text) {
      return current.result.text;
    }

    if (current.step === 'webSearch' && current.result?.text) {
      return current.result?.text;
    }

    if (current.step === 'image_understand' && current.result?.text) {
      return current.result.text;
    }
  }

  return '';
}

const INLINE_IMAGE_PATTERN = /!\[[^\]]*\]\((data:image\/[^)]+)\)/g;

function extractInlineImages(text: string): InlineImageExtraction {
  if (!text) return { cleaned: '', images: [] };
  const images: string[] = [];
  const cleaned = text
    .replace(INLINE_IMAGE_PATTERN, (_match, dataUrl: string) => {
      images.push(dataUrl);
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { cleaned, images };
}

function collectImages(outputs: ChatAgentToolRunOutput[]): string[] {
  const images: string[] = [];
  for (const output of outputs) {
    if ('error' in output) continue;
    if (output.step === 'image_generate' && output.result?.image) {
      images.push(`data:image/png;base64,${output.result.image}`);
    }
  }
  return images;
}

function parseImageInput(image?: ChatAgentInput['image']): ChatAgentImageInput | undefined {
  if (!image) return undefined;

  if (typeof image === 'string') {
    if (image.startsWith('data:')) {
      const [meta, base64] = image.split(',', 2);
      const mimeMatch = meta.match(/^data:(.*?);base64$/);
      return {
        data: base64,
        mimeType: mimeMatch?.[1],
      };
    }

    return {
      url: image,
    };
  }

  return undefined;
}

// Orchestrates routing + execution and exposes low-level progress events.
export class ChatAgentCore {
  executor: Executor;

  constructor({ executor }: { executor?: Executor } = {}) {
    this.executor = executor || new Executor();
  }

  // Runs routing first, then executes the plan with the executor.
  async handle({
    input,
    image,
    intents,
    onProgress,
    history,
  }: ChatAgentCoreHandleInput): Promise<ChatAgentCoreHandleOutput> {
    const hasExplicitIntents = Array.isArray(intents) && intents.length > 0;
    const normalizedIntents = hasExplicitIntents ? normalizeIntents(intents) : [];
    if (!hasExplicitIntents) {
      onProgress?.({ type: 'route:start' });
      const routing = await route({ input, hasImage: Boolean(image) });
      onProgress?.({
        type: 'route:complete',
        intents: routing.intents,
      });
      const result = await this.executor.run({
        input,
        intents: routing.intents,
        image,
        onProgress,
        history,
      });

      return {
        routing,
        ...result,
      };
    }

    const result = await this.executor.run({
      input,
      intents: normalizedIntents,
      image,
      onProgress,
      history,
    });

    return {
      routing: {
        intents: normalizedIntents,
        raw: { intents: normalizedIntents, mode: 'manual' },
        model: 'manual',
        duration: 0,
      },
      ...result,
    };
  }
}

// High-level facade that converts raw outputs into UI-friendly structures.
export class ChatAgent {
  #core: ChatAgentCore;

  constructor(coreAgent: ChatAgentCore = new ChatAgentCore()) {
    this.#core = coreAgent;
  }

  // Parses image input, runs the core agent, and shapes the final response.
  async handle(input: ChatAgentInput): Promise<ChatAgentOutput> {
    const image = parseImageInput(input.image);
    const result = await this.#core.handle({
      input: input.text,
      image,
      intents: input.intents,
      onProgress: input.onProgress,
      history: input.history,
    });

    const plan = result.plan;
    const outputs = result.outputs;
    const intents = result.routing.intents;
    const answer = pickFinalAnswer(outputs);
    const { cleaned, images: inlineImages } = extractInlineImages(answer);
    const images = [...collectImages(outputs), ...inlineImages];

    return {
      routing: {
        intents: intents.map((name) => ({ name, confidence: 1 })),
        duration: result.routing.duration,
      },
      plan: toPlan(plan),
      toolOutputs: outputs.map((output, index) => toToolOutput({ output, index })),
      answer: cleaned,
      images: images.length ? images : undefined,
    };
  }
}

export const chatAgent = new ChatAgent();

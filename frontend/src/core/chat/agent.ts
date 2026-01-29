import type {
  ChatAgentImageInput,
  ChatAgentInput,
  ChatAgentImageInputPayload,
  ChatAgentCoreHandleInput,
  ChatAgentCoreHandleOutput,
  ChatAgentOutput,
  ChatAgentToolName,
  ChatAgentToolOutput,
  ChatAgentToolOutputInput,
  ChatAgentToolRunOutput,
  InlineImageExtraction,
} from '@/types';

import { route } from './router';
import { Executor } from './executor';
import { buildPlanSteps, normalizePlan } from './plan';

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

    if (current.step === 'chat_tool' && current.result?.text) {
      return current.result.text;
    }

    if (current.step === 'chat_with_image_tool' && current.result?.text) {
      return current.result.text;
    }

    if (current.step === 'reasoning_tool' && current.result?.text) {
      return current.result.text;
    }

    if (current.step === 'web_search_tool' && current.result?.text) {
      return current.result?.text;
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
    if (output.step === 'image_generate_tool' && output.result?.image) {
      images.push(`data:image/png;base64,${output.result.image}`);
    }
  }
  return images;
}

function parseImageString(value: string): ChatAgentImageInput | null {
  if (!value) return null;
  if (value.startsWith('data:')) {
    const [meta, base64] = value.split(',', 2);
    const mimeMatch = meta.match(/^data:(.*?);base64$/);
    return {
      data: base64,
      mimeType: mimeMatch?.[1],
    };
  }

  return {
    url: value,
  };
}

function parseImageInput(image?: ChatAgentInput['image']): ChatAgentImageInputPayload | undefined {
  if (!image) return undefined;

  if (Array.isArray(image)) {
    const parsed = image
      .map((item) => (typeof item === 'string' ? parseImageString(item) : null))
      .filter((value): value is ChatAgentImageInput => Boolean(value));
    return parsed.length ? parsed : undefined;
  }

  if (typeof image === 'string') {
    const parsed = parseImageString(image);
    return parsed ?? undefined;
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
    const normalizedIntents = hasExplicitIntents ? normalizePlan(intents) : [];
    if (!hasExplicitIntents) {
      const hasImage = Array.isArray(image) ? image.length > 0 : Boolean(image);
      onProgress?.({ type: 'route:start' });
      const routing = await route({ input, hasImage });
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
      plan: buildPlanSteps(plan),
      toolOutputs: outputs.map((output, index) => toToolOutput({ output, index })),
      answer: cleaned,
      images: images.length ? images : undefined,
    };
  }
}

export const chatAgent = new ChatAgent();

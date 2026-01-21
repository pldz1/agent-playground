import { ChatTool } from './tools/chatTool';
import { WebSearchTool } from './tools/webSearchTool';
import { ReasoningTool } from './tools/reasoningTool';
import { ImageTool } from './tools/imageTool';
import type {
  AgentPlanProgressStep,
  AgentProgressEvent,
  AgentHistoryMessage,
  ToolName,
  ToolRunResult,
} from '@/types';

export type IntentName = 'chat' | 'webSearch' | 'reasoning' | 'image_generate' | 'image_understand';

export type ImageInput = { data?: string; url?: string; mimeType?: string };

export type ToolRunOutput =
  | { step: 'webSearch'; result: ToolRunResult }
  | { step: 'reasoning'; result: ToolRunResult }
  | { step: 'chat'; result: ToolRunResult }
  | { step: 'image_generate'; result: ToolRunResult }
  | { step: 'image_understand'; result: ToolRunResult }
  | { step: string; error: string };

export class Executor {
  tools: {
    chat: ChatTool;
    webSearch: WebSearchTool;
    reasoning: ReasoningTool;
    image: ImageTool;
  };

  constructor({ tools }: { tools?: Executor['tools'] } = {}) {
    this.tools =
      tools ||
      ({
        chat: new ChatTool(),
        webSearch: new WebSearchTool(),
        reasoning: new ReasoningTool(),
        image: new ImageTool(),
      } satisfies Executor['tools']);
  }

  async run({
    input,
    intents,
    image,
    onProgress,
    history,
  }: {
    input: string;
    intents: IntentName[];
    image?: ImageInput;
    onProgress?: (event: AgentProgressEvent) => void;
    history?: AgentHistoryMessage[];
  }) {
    const plan = this.#normalizePlan(intents, { hasImage: Boolean(image) });
    const planSteps: AgentPlanProgressStep[] = plan.map((tool, index) => ({
      id: `step-${index}`,
      tool: tool as ToolName,
    }));

    if (planSteps.length) {
      onProgress?.({ type: 'plan:ready', steps: planSteps });
    }

    let context: {
      input: string;
      image?: ImageInput;
      outputs: ToolRunOutput[];
      plan: IntentName[];
    } = {
      input,
      image,
      outputs: [],
      plan,
    };

    for (let index = 0; index < plan.length; index += 1) {
      const step = plan[index];
      const stepMeta = planSteps[index];
      if (stepMeta) {
        onProgress?.({ type: 'step:start', step: stepMeta });
      }

      try {
        if (step === 'chat') {
          const result = await this.tools.chat.reply({
            input,
            history,
          });
          context.outputs.push({ step, result });
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta });
          }
          continue;
        }

        if (step === 'webSearch') {
          const result = await this.tools.webSearch.search({ input });
          context.outputs.push({ step, result });
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta });
          }
          continue;
        }

        if (step === 'reasoning') {
          const result = await this.tools.reasoning.think({
            input,
          });
          context.outputs.push({ step, result });
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta });
          }
          continue;
        }

        if (step === 'image_generate') {
          const result = await this.tools.image.generate({ prompt: input });
          context.outputs.push({ step, result });
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta });
          }
          continue;
        }

        if (step === 'image_understand') {
          const result = await this.tools.image.understand({
            prompt: input,
            image,
          });
          context.outputs.push({ step, result });
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta });
          }
          continue;
        }

        const unknownMessage = `Unknown step: ${step}`;
        context.outputs.push({ step, error: unknownMessage });
        if (stepMeta) {
          onProgress?.({
            type: 'step:error',
            step: stepMeta,
            error: unknownMessage,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        context.outputs.push({ step, error: message });
        if (stepMeta) {
          onProgress?.({ type: 'step:error', step: stepMeta, error: message });
        }
        throw error;
      }
    }

    onProgress?.({ type: 'complete' });

    return context;
  }

  #normalizePlan(intents: IntentName[], { hasImage }: { hasImage: boolean }) {
    const unique: IntentName[] = [];
    for (const intent of intents || []) {
      if (!unique.includes(intent)) unique.push(intent);
    }

    if (!unique.length) unique.push('chat');
    return unique;
  }
}

import { ChatTool } from '../tools/chatTool';
import { WebSearchTool } from '../tools/webSearchTool';
import { ReasoningTool } from '../tools/reasoningTool';
import { ImageTool } from '../tools/imageTool';
import type { ChatAgentExecutorContext, ChatAgentExecutorRunInput } from '@/types';
import { buildPlanProgressSteps, normalizePlan } from './plan';

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

  // Executes the resolved plan sequentially and emits progress events.
  async run({ input, intents, image, onProgress, history }: ChatAgentExecutorRunInput): Promise<ChatAgentExecutorContext> {
    const plan = normalizePlan(intents);
    const planSteps = buildPlanProgressSteps(plan);

    if (planSteps.length) {
      onProgress?.({ type: 'plan:ready', steps: planSteps });
    }

    let context: ChatAgentExecutorContext = {
      input,
      image,
      outputs: [],
      plan,
    };

    for (let index = 0; index < plan.length; index += 1) {
      const step = plan[index];
      const stepMeta = planSteps[index];
      const startedAt = Date.now();
      if (stepMeta) {
        onProgress?.({ type: 'step:start', step: stepMeta });
      }

      try {
        if (step === 'chat') {
          const result = await this.tools.chat.reply({
            input,
            history,
          });
          context.outputs.push({ step, result, duration: Date.now() - startedAt });
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta });
          }
          continue;
        }

        if (step === 'webSearch') {
          const result = await this.tools.webSearch.search({ input });
          context.outputs.push({ step, result, duration: Date.now() - startedAt });
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta });
          }
          continue;
        }

        if (step === 'reasoning') {
          const result = await this.tools.reasoning.think({
            input,
          });
          context.outputs.push({ step, result, duration: Date.now() - startedAt });
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta });
          }
          continue;
        }

        if (step === 'image_generate') {
          const result = await this.tools.image.generate({ prompt: input });
          context.outputs.push({ step, result, duration: Date.now() - startedAt });
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
          context.outputs.push({ step, result, duration: Date.now() - startedAt });
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta });
          }
          continue;
        }

        const unknownMessage = `Unknown step: ${step}`;
        context.outputs.push({ step, error: unknownMessage, duration: Date.now() - startedAt });
        if (stepMeta) {
          onProgress?.({
            type: 'step:error',
            step: stepMeta,
            error: unknownMessage,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        context.outputs.push({ step, error: message, duration: Date.now() - startedAt });
        if (stepMeta) {
          onProgress?.({ type: 'step:error', step: stepMeta, error: message });
        }
        throw error;
      }
    }

    onProgress?.({ type: 'complete' });

    return context;
  }

}

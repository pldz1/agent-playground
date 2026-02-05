import { ChatTool } from '../tools/chatTool';
import { WebSearchTool } from '../tools/webSearchTool';
import { ReasoningTool } from '../tools/reasoningTool';
import { ImageTool } from '../tools/imageTool';
import type { ChatAgentExecutorContext, ChatAgentExecutorRunInput } from '@/types';
import { buildPlanProgressSteps, normalizePlan } from './plan';
import { toToolName } from './naming';

const MAX_PREVIOUS_OUTPUT_LENGTH = 2000;
const MAX_PREVIOUS_OUTPUTS = 2;

function truncateOutput(content: string): string {
  if (content.length <= MAX_PREVIOUS_OUTPUT_LENGTH) return content;
  return `${content.slice(0, MAX_PREVIOUS_OUTPUT_LENGTH - 3)}...`;
}

function buildStepInput(baseInput: string, previousOutputs: string[]): string {
  const validOutputs = previousOutputs
    .map((text) => text.trim())
    .filter((text) => Boolean(text));
  if (!validOutputs.length) return baseInput;
  const normalizedBase = baseInput.trim() || baseInput;
  const previousSection = validOutputs
    .map((text, index) => `${index + 1}. ${truncateOutput(text)}`)
    .join('\n\n');
  return `User request:\n${normalizedBase}\n\nPrevious tool results:\n${previousSection}`;
}

function recordPreviousOutput(outputs: string[], resultText?: string): string[] {
  const trimmed = resultText?.trim();
  if (!trimmed) return outputs;
  const updated = [...outputs, trimmed];
  return updated.slice(-MAX_PREVIOUS_OUTPUTS);
}

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
    let previousStepOutputs: string[] = [];

    for (let index = 0; index < plan.length; index += 1) {
      const step = plan[index];
      const stepMeta = planSteps[index];
      const toolName = toToolName(step);
      const startedAt = Date.now();
      const stepInputText = index === 0 ? input : buildStepInput(input, previousStepOutputs);
      if (stepMeta) {
        onProgress?.({ type: 'step:start', step: stepMeta });
      }

      try {
        if (step === 'chat') {
          const result = await this.tools.chat.reply({
            input: stepInputText,
            history,
          });
          const outputRecord = { step: toolName, result, duration: Date.now() - startedAt };
          context.outputs.push(outputRecord);
          previousStepOutputs = recordPreviousOutput(previousStepOutputs, result.text);
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta, output: outputRecord });
          }
          continue;
        }

        if (step === 'chat_with_image') {
          const result = await this.tools.chat.reply({
            input: stepInputText,
            history,
            image,
          });
          const outputRecord = { step: toolName, result, duration: Date.now() - startedAt };
          context.outputs.push(outputRecord);
          previousStepOutputs = recordPreviousOutput(previousStepOutputs, result.text);
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta, output: outputRecord });
          }
          continue;
        }

        if (step === 'web_search') {
          const result = await this.tools.webSearch.search({ input: stepInputText });
          const outputRecord = { step: toolName, result, duration: Date.now() - startedAt };
          context.outputs.push(outputRecord);
          previousStepOutputs = recordPreviousOutput(previousStepOutputs, result.text);
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta, output: outputRecord });
          }
          continue;
        }

        if (step === 'reasoning') {
          const result = await this.tools.reasoning.think({
            input: stepInputText,
          });
          const outputRecord = { step: toolName, result, duration: Date.now() - startedAt };
          context.outputs.push(outputRecord);
          previousStepOutputs = recordPreviousOutput(previousStepOutputs, result.text);
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta, output: outputRecord });
          }
          continue;
        }

        if (step === 'image_generate') {
          const result = await this.tools.image.generate({ prompt: stepInputText });
          const outputRecord = { step: toolName, result, duration: Date.now() - startedAt };
          context.outputs.push(outputRecord);
          previousStepOutputs = recordPreviousOutput(previousStepOutputs, result.text);
          if (stepMeta) {
            onProgress?.({ type: 'step:complete', step: stepMeta, output: outputRecord });
          }
          continue;
        }

        const unknownMessage = `Unknown step: ${step}`;
        const errorRecord = { step: toolName, error: unknownMessage, duration: Date.now() - startedAt };
        context.outputs.push(errorRecord);
        if (stepMeta) {
          onProgress?.({
            type: 'step:error',
            step: stepMeta,
            error: unknownMessage,
            output: errorRecord,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const errorRecord = { step: toolName, error: message, duration: Date.now() - startedAt };
        context.outputs.push(errorRecord);
        if (stepMeta) {
          onProgress?.({ type: 'step:error', step: stepMeta, error: message, output: errorRecord });
        }
        throw error;
      }
    }

    onProgress?.({ type: 'complete' });

    return context;
  }

}

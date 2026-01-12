import type { ImageInput, IntentName, ToolRunOutput } from "./executor";
import type {
  AgentInput,
  AgentOutput,
  PlanStep,
  ToolName,
  ToolOutput,
} from "../types/agent";

import { route } from "./router";
import { Executor } from "./executor";

const PLAN_DESCRIPTIONS: Record<IntentName, string> = {
  chat: "Chat message response",
  reasoning: "Deep reasoning analysis",
  web_search: "Perform web search",
  image_generate: "Generate image",
  image_understand: "Understand image content",
};

function toPlan(plan: IntentName[] = []): PlanStep[] {
  return plan.map((tool, index) => ({
    id: `step-${index}`,
    tool: tool as ToolName,
    description: PLAN_DESCRIPTIONS[tool] ?? tool,
  }));
}

function toToolOutput({
  output,
  index,
  inputText,
}: {
  output: ToolRunOutput;
  index: number;
  inputText: string;
}): ToolOutput {
  const base: Pick<ToolOutput, "stepId" | "tool"> = {
    stepId: `step-${index}`,
    tool: output.step as ToolName,
  };

  if ("error" in output) {
    return {
      ...base,
      status: "fail",
      data: null,
      error: output.error,
    };
  }

  switch (output.step) {
    case "web_search":
      return {
        ...base,
        status: "success",
        data: {
          query: inputText,
          output_text: output.web?.output_text,
          sources: [],
          raw: output.web,
        },
      };
    case "reasoning":
      return {
        ...base,
        status: "success",
        data: {
          answer: {
            text: output.answer?.text ?? "",
          },
          raw: output.answer,
        },
      };
    case "chat":
      return {
        ...base,
        status: "success",
        data: {
          message: {
            text: output.answer?.text ?? "",
          },
          raw: output.answer,
        },
      };
    case "image_generate": {
      const candidates = Array.isArray(output.result?.data?.data)
        ? output.result.data.data
        : [];
      const images = candidates
        .map((candidate: any) => {
          if (typeof candidate?.b64_json === "string") {
            return `data:image/png;base64,${candidate.b64_json}`;
          }
          if (typeof candidate?.url === "string") {
            return candidate.url;
          }
          return null;
        })
        .filter((url: any): url is string => Boolean(url));

      return {
        ...base,
        status: "success",
        data: {
          prompt: inputText,
          images,
          raw: output.result,
        },
      };
    }
    case "image_understand":
      return {
        ...base,
        status: "success",
        data: {
          caption: "Image understanding result",
          description: output.result?.text ?? "",
          raw: output.result,
        },
      };
    default:
      return {
        ...base,
        status: "success",
        data: output,
      };
  }
}

function pickFinalAnswer(outputs: ToolRunOutput[]): string {
  if (!outputs.length) return "";

  for (let i = outputs.length - 1; i >= 0; i -= 1) {
    const current = outputs[i];

    if ("error" in current) {
      return current.error;
    }

    if (current.step === "chat" && current.answer?.text) {
      return current.answer.text;
    }

    if (current.step === "reasoning" && current.answer?.text) {
      return current.answer.text;
    }

    if (current.step === "web_search" && current.web?.output_text) {
      return current.web.output_text;
    }

    if (current.step === "image_understand" && current.result?.text) {
      return current.result.text;
    }

    if (current.step === "image_generate") {
      return "Image generation complete, please check the generated image results.";
    }
  }

  return "";
}

function parseImageInput(image?: AgentInput["image"]): ImageInput | undefined {
  if (!image) return undefined;

  if (typeof image === "string") {
    if (image.startsWith("data:")) {
      const [meta, base64] = image.split(",", 2);
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

export class CoreAgent {
  executor: Executor;

  constructor({ executor }: { executor?: Executor } = {}) {
    this.executor = executor || new Executor();
  }

  async handle({
    input,
    image,
  }: {
    input: string;
    image?: ImageInput;
  }): Promise<{
    routing: any;
    plan: any;
    outputs: any;
    input: string;
    image?: ImageInput;
    web: any;
  }> {
    const routing = await route({ input, hasImage: Boolean(image) });
    const result = await this.executor.run({
      input,
      intents: routing.intents,
      image,
    });

    return {
      routing,
      ...result,
    };
  }
}

export class Agent {
  #core: CoreAgent;

  constructor(coreAgent: CoreAgent = new CoreAgent()) {
    this.#core = coreAgent;
  }

  async handle(input: AgentInput): Promise<AgentOutput> {
    const image = parseImageInput(input.image);
    const result = await this.#core.handle({
      input: input.text,
      image,
    });

    const plan = Array.isArray(result.plan)
      ? (result.plan as IntentName[])
      : [];
    const outputs = Array.isArray(result.outputs)
      ? (result.outputs as ToolRunOutput[])
      : [];
    const intents = Array.isArray(result.routing?.intents)
      ? (result.routing.intents as IntentName[])
      : [];

    return {
      routing: {
        intents: intents.map((name) => ({ name, confidence: 1 })),
      },
      plan: toPlan(plan),
      toolOutputs: outputs.map((output, index) =>
        toToolOutput({ output, index, inputText: input.text })
      ),
      answer: pickFinalAnswer(outputs),
    };
  }
}

export const agent = new Agent();

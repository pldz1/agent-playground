import { ChatTool } from "./tools/chatTool";
import { WebSearchTool } from "./tools/webSearchTool";
import { ReasoningTool } from "./tools/reasoningTool";
import { ImageTool } from "./tools/imageTool";

export type IntentName =
  | "chat"
  | "web_search"
  | "reasoning"
  | "image_generate"
  | "image_understand";

export type ImageInput = { data?: string; url?: string; mimeType?: string };

export type ToolRunOutput =
  | { step: "web_search"; web: any }
  | { step: "reasoning"; answer: any }
  | { step: "chat"; answer: any }
  | { step: "image_generate"; result: any }
  | { step: "image_understand"; result: any }
  | { step: string; error: string };

export class Executor {
  tools: {
    chat: ChatTool;
    web_search: WebSearchTool;
    reasoning: ReasoningTool;
    image: ImageTool;
  };

  constructor({ tools }: { tools?: Executor["tools"] } = {}) {
    this.tools =
      tools ||
      ({
        chat: new ChatTool(),
        web_search: new WebSearchTool(),
        reasoning: new ReasoningTool(),
        image: new ImageTool(),
      } satisfies Executor["tools"]);
  }

  async run({
    input,
    intents,
    image,
  }: {
    input: string;
    intents: IntentName[];
    image?: ImageInput;
  }) {
    const plan = this.#normalizePlan(intents, { hasImage: Boolean(image) });

    let context: {
      input: string;
      image?: ImageInput;
      web: any;
      outputs: ToolRunOutput[];
      plan: IntentName[];
    } = {
      input,
      image,
      web: null,
      outputs: [],
      plan,
    };

    for (const step of plan) {
      if (step === "chat") {
        const answer = await this.tools.chat.reply({
          input,
          context: context.web,
        });
        context.outputs.push({ step, answer });
        continue;
      }

      if (step === "web_search") {
        const web = await this.tools.web_search.search({ input });
        context.web = web;
        context.outputs.push({ step, web });
        continue;
      }

      if (step === "reasoning") {
        const answer = await this.tools.reasoning.think({
          input,
          context: context.web,
        });
        context.outputs.push({ step, answer });
        continue;
      }

      if (step === "image_generate") {
        const result = await this.tools.image.generate({ prompt: input });
        context.outputs.push({ step, result });
        continue;
      }

      if (step === "image_understand") {
        const result = await this.tools.image.understand({
          prompt: input,
          image,
        });
        context.outputs.push({ step, result });
        continue;
      }

      context.outputs.push({ step, error: `Unknown step: ${step}` });
    }

    return context;
  }

  #normalizePlan(intents: IntentName[], { hasImage }: { hasImage: boolean }) {
    const unique: IntentName[] = [];
    for (const intent of intents || []) {
      if (!unique.includes(intent)) unique.push(intent);
    }

    if (hasImage && !unique.includes("image_understand")) {
      unique.unshift("image_understand");
    }

    if (unique.includes("web_search")) {
      if (!unique.includes("reasoning") && !unique.includes("chat")) {
        unique.push("chat");
      }
      unique.sort((a, b) => {
        const order: IntentName[] = ["web_search", "reasoning", "chat"];
        const ai = order.includes(a) ? order.indexOf(a) : 99;
        const bi = order.includes(b) ? order.indexOf(b) : 99;
        return ai - bi;
      });
    }

    if (!unique.length) unique.push("chat");
    return unique;
  }
}

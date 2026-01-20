export type ToolName =
  | "webSearch"
  | "reasoning"
  | "chat"
  | "image_generate"
  | "image_understand";

export type StepStatus = "pending" | "running" | "success" | "fail";

export interface Intent {
  name: string;
  confidence: number;
}

export interface Routing {
  intents: Intent[];
}

export interface PlanStep {
  id: string;
  tool: ToolName;
  description: string;
}

export interface WebSearchOutput {
  query: string;
  output_text: string;
  sources?: string[];
}

export interface ReasoningOutput {
  answer: {
    text: string;
  };
}

export interface ChatOutput {
  message: {
    text: string;
  };
}

export interface ImageGenerateOutput {
  images: string[];
  prompt: string;
}

export interface ImageUnderstandOutput {
  caption: string;
  description: string;
}

export interface ToolOutput {
  stepId: string;
  tool: ToolName;
  status: StepStatus;
  duration?: number;
  data: any;
  error?: string;
}

export interface AgentHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentPlanProgressStep {
  id: string;
  tool: ToolName;
}

export type AgentProgressEvent =
  | { type: "route:start" }
  | { type: "route:complete"; intents: string[] }
  | { type: "plan:ready"; steps: AgentPlanProgressStep[] }
  | { type: "step:start"; step: AgentPlanProgressStep }
  | { type: "step:complete"; step: AgentPlanProgressStep }
  | { type: "step:error"; step: AgentPlanProgressStep; error: string }
  | { type: "complete" };

export interface AgentInput {
  text: string;
  image?: File | string;
  onProgress?: (event: AgentProgressEvent) => void;
  history?: AgentHistoryMessage[];
}

export interface AgentOutput {
  routing: Routing;
  plan: PlanStep[];
  toolOutputs: ToolOutput[];
  answer: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  timestamp: number;
  routing?: Routing;
  plan?: PlanStep[];
  toolOutputs?: ToolOutput[];
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  status: SessionStatus;
}

export type SessionStatus = "idle" | "running" | "error";

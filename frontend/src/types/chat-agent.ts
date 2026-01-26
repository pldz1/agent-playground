export type ChatAgentIntentName =
  | 'webSearch'
  | 'reasoning'
  | 'chat'
  | 'image_generate'
  | 'image_understand';

export type ChatAgentToolName = ChatAgentIntentName;

export type ChatAgentStepStatus = 'pending' | 'running' | 'success' | 'fail';

export interface ChatAgentIntent {
  name: ChatAgentIntentName;
  confidence: number;
}

export interface ChatAgentRouting {
  intents: ChatAgentIntent[];
}

export interface ChatAgentPlanStep {
  id: string;
  tool: ChatAgentToolName;
  description: string;
}

export interface ChatAgentToolRunResult {
  text?: string;
  image?: string;
  raw?: unknown;
}

export type ChatAgentToolRunOutput =
  | { step: ChatAgentIntentName; result: ChatAgentToolRunResult }
  | { step: string; error: string };

export interface ChatAgentToolOutput {
  stepId: string;
  tool: ChatAgentToolName;
  status: ChatAgentStepStatus;
  duration?: number;
  data: ChatAgentToolRunOutput | null;
  error?: string;
}

export interface ChatAgentHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatAgentPlanProgressStep {
  id: string;
  tool: ChatAgentToolName;
}

export type ChatAgentProgressEvent =
  | { type: 'route:start' }
  | { type: 'route:complete'; intents: ChatAgentIntentName[] }
  | { type: 'plan:ready'; steps: ChatAgentPlanProgressStep[] }
  | { type: 'step:start'; step: ChatAgentPlanProgressStep }
  | { type: 'step:complete'; step: ChatAgentPlanProgressStep }
  | { type: 'step:error'; step: ChatAgentPlanProgressStep; error: string }
  | { type: 'complete' };

export interface ChatAgentImageInput {
  data?: string;
  url?: string;
  mimeType?: string;
}

export interface ChatAgentInput {
  text: string;
  image?: File | string;
  onProgress?: (event: ChatAgentProgressEvent) => void;
  history?: ChatAgentHistoryMessage[];
}

export interface ChatAgentOutput {
  routing: ChatAgentRouting;
  plan: ChatAgentPlanStep[];
  toolOutputs: ChatAgentToolOutput[];
  answer: string;
  images?: string[];
}

export interface ChatAgentExecutorContext {
  input: string;
  image?: ChatAgentImageInput;
  outputs: ChatAgentToolRunOutput[];
  plan: ChatAgentIntentName[];
}

export interface ChatAgentRouteResult {
  intents: ChatAgentIntentName[];
  raw: unknown;
  model: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp: number;
  routing?: ChatAgentRouting;
  plan?: ChatAgentPlanStep[];
  toolOutputs?: ChatAgentToolOutput[];
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  status: SessionStatus;
}

export type SessionStatus = 'idle' | 'running' | 'error';

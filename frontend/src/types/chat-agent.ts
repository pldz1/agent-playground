export type ChatAgentIntentName =
  | 'chat'
  | 'web_search'
  | 'chat_with_image'
  | 'reasoning'
  | 'image_generate';

export type ChatAgentPlanName = `${ChatAgentIntentName}_plan`;

export type ChatAgentToolName = `${ChatAgentIntentName}_tool`;

export type ChatAgentStepStatus = 'pending' | 'running' | 'success' | 'fail';

export interface ChatAgentIntent {
  name: ChatAgentIntentName;
  confidence: number;
}

export interface ChatAgentRouting {
  intents: ChatAgentIntent[];
  duration?: number;
}

export interface ChatAgentPlanStep {
  id: string;
  tool: ChatAgentPlanName;
  description: string;
}

export interface ChatAgentToolRunResult {
  text?: string;
  image?: string;
  raw?: unknown;
}

export type ChatAgentToolRunOutput =
  | { step: ChatAgentToolName; result: ChatAgentToolRunResult; duration?: number }
  | { step: string; error: string; duration?: number };

export interface ChatAgentToolOutput {
  stepId: string;
  tool: ChatAgentToolName;
  status: ChatAgentStepStatus;
  duration?: number;
  data: ChatAgentToolRunOutput | null;
  error?: string;
}

export interface ChatAgentToolOutputInput {
  output: ChatAgentToolRunOutput;
  index: number;
}

export interface ChatAgentHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ChatAgentRawImageInput = File | string | Array<File | string>;
export type ChatAgentImageInputPayload = ChatAgentImageInput | ChatAgentImageInput[];

export interface ChatAgentPlanProgressStep {
  id: string;
  tool: ChatAgentPlanName;
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
  image?: ChatAgentRawImageInput;
  intents?: ChatAgentIntentName[];
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
  image?: ChatAgentImageInputPayload;
  outputs: ChatAgentToolRunOutput[];
  plan: ChatAgentIntentName[];
}

export interface ChatAgentExecutorRunInput {
  input: string;
  intents: ChatAgentIntentName[];
  image?: ChatAgentImageInputPayload;
  onProgress?: (event: ChatAgentProgressEvent) => void;
  history?: ChatAgentHistoryMessage[];
}

export interface ChatAgentRouteInput {
  input: string;
  hasImage?: boolean;
}

export interface InlineImageExtraction {
  cleaned: string;
  images: string[];
}

export interface ImageToolGenerateInput {
  prompt: string;
  size?: string;
  model?: string;
}

export interface ChatAgentCoreHandleInput {
  input: string;
  image?: ChatAgentImageInputPayload;
  intents?: ChatAgentIntentName[];
  onProgress?: (event: ChatAgentProgressEvent) => void;
  history?: ChatAgentInput['history'];
}

export interface ChatAgentCoreHandleOutput extends ChatAgentExecutorContext {
  routing: ChatAgentRouteResult;
}

export interface ChatAgentRouteResult {
  intents: ChatAgentIntentName[];
  raw: unknown;
  model: string;
  duration?: number;
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

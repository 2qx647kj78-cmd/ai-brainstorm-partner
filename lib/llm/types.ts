export type ProviderName = "ollama" | "anthropic" | "openai";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface StreamArgs {
  model: string;
  system: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}

export interface LLMProvider {
  name: ProviderName;
  listModels(): Promise<string[]>;
  stream(args: StreamArgs): AsyncIterable<string>;
}

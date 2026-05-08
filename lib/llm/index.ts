import { ollamaProvider } from "./ollama";
import { anthropicProvider } from "./anthropic";
import { openaiProvider } from "./openai";
import type { LLMProvider, ProviderName } from "./types";

const providers: Record<ProviderName, LLMProvider> = {
  ollama: ollamaProvider,
  anthropic: anthropicProvider,
  openai: openaiProvider,
};

export function getProvider(name: ProviderName): LLMProvider {
  const p = providers[name];
  if (!p) throw new Error(`Unknown provider: ${name}`);
  return p;
}

export const PROVIDER_NAMES: ProviderName[] = [
  "ollama",
  "anthropic",
  "openai",
];

export type { LLMProvider, ProviderName, ChatMessage } from "./types";

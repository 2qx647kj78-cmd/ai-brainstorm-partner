import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, StreamArgs } from "./types";

let _client: Anthropic | null = null;
function client() {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

const DEFAULT_MODELS = [
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
];

export const anthropicProvider: LLMProvider = {
  name: "anthropic",

  async listModels() {
    return DEFAULT_MODELS;
  },

  async *stream({ model, system, messages, signal }: StreamArgs) {
    const stream = client().messages.stream(
      {
        model,
        max_tokens: 4096,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
      { signal },
    );
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  },
};

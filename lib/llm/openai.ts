import OpenAI from "openai";
import type { LLMProvider, StreamArgs } from "./types";

let _client: OpenAI | null = null;
function client() {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

const DEFAULT_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];

export const openaiProvider: LLMProvider = {
  name: "openai",

  async listModels() {
    try {
      const res = await client().models.list();
      const ids = res.data
        .map((m) => m.id)
        .filter((id) => id.startsWith("gpt-"))
        .sort();
      return ids.length > 0 ? ids : DEFAULT_MODELS;
    } catch {
      return DEFAULT_MODELS;
    }
  },

  async *stream({ model, system, messages, signal }: StreamArgs) {
    const stream = await client().chat.completions.create(
      {
        model,
        stream: true,
        messages: [
          { role: "system", content: system },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
      },
      { signal },
    );
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  },
};

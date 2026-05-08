import { Ollama } from "ollama";
import type { LLMProvider, StreamArgs } from "./types";

const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const client = new Ollama({ host: baseURL });

export const ollamaProvider: LLMProvider = {
  name: "ollama",

  async listModels() {
    const res = await client.list();
    return res.models.map((m) => m.name);
  },

  async *stream({ model, system, messages }: StreamArgs) {
    const stream = await client.chat({
      model,
      stream: true,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
    for await (const chunk of stream) {
      const text = chunk.message?.content;
      if (text) yield text;
    }
  },
};

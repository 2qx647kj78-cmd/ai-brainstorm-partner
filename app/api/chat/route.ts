import { NextRequest } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/llm";
import { getMode } from "@/lib/prompts";
import { requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ChatRequestSchema = z.object({
  provider: z.enum(["ollama", "anthropic", "openai"]),
  model: z.string().min(1),
  mode: z.enum(["socratic", "outline", "proContra", "mindmap"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const authResult = await requireUser();
  if (!authResult.ok) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = ChatRequestSchema.parse(await req.json());
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: String(err) }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const provider = getProvider(body.provider);
  const mode = getMode(body.mode);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.stream({
          model: body.model,
          system: mode.systemPrompt,
          messages: body.messages,
          signal: req.signal,
        })) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\n\n[error: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

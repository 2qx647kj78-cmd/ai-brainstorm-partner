import { NextRequest } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/llm";
import { getMode } from "@/lib/prompts";
import { requireUser } from "@/lib/auth/requireUser";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateTitle } from "@/lib/llm/title";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ChatRequestSchema = z.object({
  provider: z.enum(["ollama", "anthropic", "openai"]),
  model: z.string().min(1),
  mode: z.enum(["socratic", "outline", "proContra", "mindmap"]),
  sessionId: z.string().uuid().optional(),
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
  const auth = await requireUser();
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
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

  const lastUserMessage = [...body.messages]
    .reverse()
    .find((m) => m.role === "user");

  // Persist the new user message before streaming, if we have an authed session.
  if (auth.userId && body.sessionId && lastUserMessage) {
    const supabase = await createServerSupabase();
    await supabase.from("messages").insert({
      session_id: body.sessionId,
      role: "user",
      content: lastUserMessage.content,
    });
  }

  const encoder = new TextEncoder();
  let assistantText = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.stream({
          model: body.model,
          system: mode.systemPrompt,
          messages: body.messages,
          signal: req.signal,
        })) {
          assistantText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\n\n[error: ${msg}]`));
        controller.close();
      } finally {
        if (auth.userId && body.sessionId && assistantText) {
          try {
            const supabase = await createServerSupabase();
            await supabase.from("messages").insert({
              session_id: body.sessionId,
              role: "assistant",
              content: assistantText,
            });
            await supabase
              .from("sessions")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", body.sessionId);

            // Auto-title on the first turn: generate via LLM, fall back to
            // the first user message if generation fails.
            const isFirstTurn = body.messages.length === 1;
            if (isFirstTurn && lastUserMessage) {
              const llmTitle = await generateTitle({
                provider: body.provider,
                model: body.model,
                userMessage: lastUserMessage.content,
                assistantMessage: assistantText,
              });
              const title = llmTitle ?? lastUserMessage.content.slice(0, 80);
              await supabase
                .from("sessions")
                .update({ title })
                .eq("id", body.sessionId)
                .is("title", null);
            }
          } catch {
            // Persistence failure should not break the stream that already completed.
          }
        }
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

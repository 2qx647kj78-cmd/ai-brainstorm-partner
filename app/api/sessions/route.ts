import { NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  mode: z.enum(["socratic", "outline", "proContra", "mindmap"]),
  provider: z.enum(["ollama", "anthropic", "openai"]),
  model: z.string().min(1),
  title: z.string().optional(),
});

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return Response.json({ error: auth.error }, { status: 401 });
  if (!auth.userId) return Response.json({ sessions: [] });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, title, mode, provider, model, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ sessions: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return Response.json({ error: auth.error }, { status: 401 });
  if (!auth.userId)
    return Response.json(
      { error: "Auth required to persist sessions" },
      { status: 401 },
    );

  let body;
  try {
    body = CreateSchema.parse(await req.json());
  } catch (err) {
    return Response.json(
      { error: "Invalid request", details: String(err) },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: auth.userId,
      mode: body.mode,
      provider: body.provider,
      model: body.model,
      title: body.title ?? null,
    })
    .select("id, title, mode, provider, model, created_at, updated_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ session: data });
}

import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return Response.json({ error: auth.error }, { status: 401 });
  if (!auth.userId) return Response.json({ session: null, messages: [] });

  const { id } = await params;
  const supabase = await createServerSupabase();

  const sessionRes = await supabase
    .from("sessions")
    .select("id, title, mode, provider, model, created_at, updated_at")
    .eq("id", id)
    .single();
  if (sessionRes.error)
    return Response.json({ error: sessionRes.error.message }, { status: 404 });

  const messagesRes = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true });
  if (messagesRes.error)
    return Response.json(
      { error: messagesRes.error.message },
      { status: 500 },
    );

  return Response.json({
    session: sessionRes.data,
    messages: messagesRes.data,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return Response.json({ error: auth.error }, { status: 401 });
  if (!auth.userId)
    return Response.json({ error: "Auth required" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

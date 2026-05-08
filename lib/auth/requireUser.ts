import { createServerSupabase } from "@/lib/supabase/server";

export type AuthResult =
  | { ok: true; userId: string | null }
  | { ok: false; error: string };

/**
 * Verifies the user is authenticated via Supabase.
 * If Supabase env vars are NOT configured, runs in single-user dev mode
 * (returns ok with userId=null) so local development works without setup.
 */
export async function requireUser(): Promise<AuthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: true, userId: null };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { ok: false, error: "Unauthorized" };
  }
  return { ok: true, userId: data.user.id };
}

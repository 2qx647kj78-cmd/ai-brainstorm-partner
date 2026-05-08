"use client";

import { useState } from "react";
import { createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Single-User Dev Mode</h1>
          <p className="text-sm text-zinc-600">
            Supabase ist nicht konfiguriert. Die App läuft ohne Login.
          </p>
          <a href="/" className="inline-block mt-4 underline">
            Zur App
          </a>
        </div>
      </div>
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-zinc-50 dark:bg-black">
      <form
        onSubmit={send}
        className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold mb-1">🧠 Brainstorm Partner</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Login per Magic-Link. Du bekommst gleich eine E-Mail.
        </p>

        <label className="block text-sm font-medium mb-1">E-Mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="du@example.com"
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          disabled={status === "sending" || status === "sent"}
        />

        <button
          type="submit"
          disabled={status === "sending" || status === "sent"}
          className="w-full mt-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white py-2 text-sm font-medium disabled:opacity-50"
        >
          {status === "sending"
            ? "Sende…"
            : status === "sent"
              ? "✓ Gesendet"
              : "Magic-Link senden"}
        </button>

        {status === "sent" && (
          <p className="mt-4 text-xs text-emerald-600 dark:text-emerald-400">
            Check dein Postfach und klick auf den Link.
          </p>
        )}
        {status === "error" && error && (
          <p className="mt-4 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </form>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MODE_LIST, type ModeId } from "@/lib/prompts";
import type { ProviderName } from "@/lib/llm/types";
import RecordButton from "@/components/RecordButton";
import SessionSidebar from "@/components/SessionSidebar";
import MindmapView from "@/components/MindmapView";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { parseMarkdownTree } from "@/lib/markdown/parseTree";
import {
  buildSessionMarkdown,
  downloadMarkdown,
  slugify,
} from "@/lib/markdown/exportSession";

type Msg = { role: "user" | "assistant"; content: string };

const PROVIDERS: { id: ProviderName; label: string }[] = [
  { id: "ollama", label: "Ollama (lokal)" },
  { id: "anthropic", label: "Claude" },
  { id: "openai", label: "OpenAI" },
];

export default function BrainstormApp() {
  const [provider, setProvider] = useState<ProviderName>("ollama");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState<string>("");
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [mode, setMode] = useState<ModeId>("socratic");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const persistEnabled = isSupabaseConfigured();

  useEffect(() => {
    let cancelled = false;
    setModels([]);
    setModelsError(null);
    fetch(`/api/models?provider=${provider}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setModelsError(data.error);
        const list: string[] = data.models ?? [];
        setModels(list);
        setModel(list[0] ?? "");
      })
      .catch((e) => {
        if (!cancelled) setModelsError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function ensureSession(): Promise<string | null> {
    if (!persistEnabled) return null;
    if (sessionId) return sessionId;
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, provider, model }),
      });
      const data = await res.json();
      if (data.session?.id) {
        setSessionId(data.session.id);
        return data.session.id;
      }
    } catch (err) {
      console.error("Failed to create session", err);
    }
    return null;
  }

  async function send(text: string) {
    if (!text.trim() || !model || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const sid = await ensureSession();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          mode,
          sessionId: sid ?? undefined,
          messages: next,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `[error: ${res.status}] ${err}` },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `[error] ${(err as Error).message}` },
        ]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      setSidebarRefresh((n) => n + 1);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function newSession() {
    stop();
    setMessages([]);
    setSessionId(null);
  }

  async function loadSession(id: string) {
    stop();
    try {
      const res = await fetch(`/api/sessions/${id}`);
      const data = await res.json();
      if (data.session) {
        setSessionId(data.session.id);
        setMode(data.session.mode);
        setProvider(data.session.provider);
        setModel(data.session.model);
        setMessages(
          (data.messages ?? []).map((m: { role: "user" | "assistant"; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        );
      }
    } catch (err) {
      console.error("Failed to load session", err);
    }
  }

  async function signOut() {
    await fetch("/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  function exportMarkdown() {
    if (messages.length === 0) return;
    const firstUser = messages.find((m) => m.role === "user");
    const title = firstUser?.content.slice(0, 60) ?? "session";
    const md = buildSessionMarkdown({
      mode,
      provider,
      model,
      messages,
      title,
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadMarkdown(`brainstorm-${date}-${slugify(title)}.md`, md);
  }

  async function handleAudio(blob: Blob) {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (data.text) {
        setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
      } else if (data.error) {
        setInput((prev) => `${prev}\n[transcription error: ${data.error}]`);
      }
    } catch (err) {
      setInput((prev) => `${prev}\n[error: ${(err as Error).message}]`);
    } finally {
      setTranscribing(false);
    }
  }

  return (
    <div className="flex h-dvh bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      <SessionSidebar
        currentId={sessionId}
        onSelect={loadSession}
        onNew={newSession}
        onSignOut={signOut}
        refreshKey={sidebarRefresh}
        enabled={persistEnabled}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-semibold tracking-tight">
            🧠 Brainstorm Partner
          </h1>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Picker
              label="Modus"
              value={mode}
              onChange={(v) => setMode(v as ModeId)}
              options={MODE_LIST.map((m) => ({ value: m.id, label: m.label }))}
            />
            <Picker
              label="Provider"
              value={provider}
              onChange={(v) => setProvider(v as ProviderName)}
              options={PROVIDERS.map((p) => ({ value: p.id, label: p.label }))}
            />
            <Picker
              label="Modell"
              value={model}
              onChange={setModel}
              options={models.map((m) => ({ value: m, label: m }))}
              disabled={models.length === 0}
              placeholder={modelsError ? "n/a" : "lädt…"}
            />
            <button
              onClick={exportMarkdown}
              disabled={messages.length === 0}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 px-2 py-1 disabled:opacity-30"
              title="Session als Markdown exportieren"
            >
              ⤓ Export
            </button>
          </div>
        </header>

        {modelsError && (
          <div className="px-6 py-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900">
            Modelle für „{provider}" konnten nicht geladen werden: {modelsError}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && <EmptyState mode={mode} />}
            {messages.map((m, i) => (
              <Message
                key={i}
                msg={m}
                mode={mode}
                streaming={streaming && i === messages.length - 1}
              />
            ))}
          </div>
        </div>

        <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <RecordButton onAudio={handleAudio} disabled={streaming} />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={2}
              placeholder={
                transcribing
                  ? "Transkribiere…"
                  : "Sprich los oder tippe (Enter sendet, Shift+Enter = Zeilenumbruch)"
              }
              className="flex-1 resize-none rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              disabled={transcribing}
            />
            {streaming ? (
              <button
                onClick={stop}
                className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || !model}
                className="px-4 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white text-sm font-medium disabled:opacity-40"
              >
                Senden
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="text-xs text-zinc-500 flex items-center gap-1">
      {label}:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50"
      >
        {options.length === 0 && (
          <option value="">{placeholder ?? "—"}</option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Message({
  msg,
  mode,
  streaming,
}: {
  msg: Msg;
  mode: ModeId;
  streaming: boolean;
}) {
  const isUser = msg.role === "user";
  const isMindmapAssistant =
    !isUser && mode === "mindmap" && !streaming && msg.content.length > 0;

  if (isMindmapAssistant) {
    return <MindmapMessage content={msg.content} />;
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
            : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        }`}
      >
        {msg.content || (
          <span className="opacity-50 italic">denke nach…</span>
        )}
      </div>
    </div>
  );
}

function MindmapMessage({ content }: { content: string }) {
  const tree = useMemo(() => parseMarkdownTree(content), [content]);
  const [showRaw, setShowRaw] = useState(false);

  if (!tree) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2 text-xs">
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
        >
          {showRaw ? "Mindmap zeigen" : "Markdown zeigen"}
        </button>
      </div>
      {showRaw ? (
        <div className="rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          {content}
        </div>
      ) : (
        <MindmapView tree={tree} />
      )}
    </div>
  );
}

function EmptyState({ mode }: { mode: ModeId }) {
  const m = MODE_LIST.find((x) => x.id === mode)!;
  return (
    <div className="text-center py-16 text-zinc-500">
      <div className="text-4xl mb-4">🎙️</div>
      <h2 className="text-xl font-medium mb-2 text-zinc-700 dark:text-zinc-300">
        {m.label}
      </h2>
      <p className="text-sm max-w-md mx-auto">{m.description}</p>
      <p className="text-xs mt-6 opacity-70">
        Drück das Mikro oder tippe drauflos.
      </p>
    </div>
  );
}

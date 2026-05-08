"use client";

import { useEffect, useState } from "react";
import type { ModeId } from "@/lib/prompts";

export type SessionSummary = {
  id: string;
  title: string | null;
  mode: ModeId;
  provider: string;
  model: string;
  updated_at: string;
};

export default function SessionSidebar({
  currentId,
  onSelect,
  onNew,
  onSignOut,
  refreshKey,
  enabled,
  open,
  onClose,
}: {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSignOut: () => void;
  refreshKey: number;
  enabled: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSessions(data.sessions ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [refreshKey, enabled]);

  async function del(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Session löschen?")) return;
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions((s) => s.filter((x) => x.id !== id));
    if (currentId === id) onNew();
  }

  if (!enabled) {
    return (
      <aside className="hidden md:flex w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex-col p-4 text-xs text-zinc-500">
        Single-User Dev Mode — keine Sessions persistiert.
      </aside>
    );
  }

  const wrapperClass = `
    fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-black
    border-r border-zinc-200 dark:border-zinc-800 flex flex-col
    transition-transform duration-200
    md:relative md:translate-x-0 md:z-auto
    ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
  `;

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          aria-hidden
        />
      )}
      <aside className={wrapperClass}>
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex gap-2">
        <button
          onClick={onNew}
          className="flex-1 text-sm rounded-lg bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white py-2 font-medium"
        >
          + Neu
        </button>
        <button
          onClick={onClose}
          className="md:hidden text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500"
          aria-label="Sidebar schließen"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && <div className="text-xs text-zinc-500 px-2">lädt…</div>}
        {!loading && sessions.length === 0 && (
          <div className="text-xs text-zinc-500 px-2 py-4">
            Noch keine Sessions.
          </div>
        )}
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`group w-full text-left rounded-lg px-2 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              currentId === s.id
                ? "bg-zinc-100 dark:bg-zinc-800"
                : ""
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">
                  {s.title ?? "(ohne Titel)"}
                </div>
                <div className="text-xs text-zinc-500 truncate">
                  {s.mode} · {s.provider}
                </div>
              </div>
              <span
                onClick={(e) => del(s.id, e)}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 text-xs px-1"
                role="button"
                aria-label="Löschen"
              >
                ✕
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onSignOut}
          className="w-full text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Abmelden
        </button>
      </div>
      </aside>
    </>
  );
}

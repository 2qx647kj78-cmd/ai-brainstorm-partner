import { MODES, type ModeId } from "@/lib/prompts";

export interface ExportableMessage {
  role: "user" | "assistant";
  content: string;
}

export function buildSessionMarkdown(args: {
  mode: ModeId;
  provider: string;
  model: string;
  messages: ExportableMessage[];
  title?: string | null;
}): string {
  const { mode, provider, model, messages, title } = args;
  const date = new Date().toLocaleString("de-DE");
  const modeLabel = MODES[mode]?.label ?? mode;

  const lines: string[] = [];
  lines.push(`# Brainstorm Session${title ? `: ${title}` : ""}`);
  lines.push("");
  lines.push(`- **Modus:** ${modeLabel}`);
  lines.push(`- **Provider:** ${provider} / ${model}`);
  lines.push(`- **Exportiert:** ${date}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const m of messages) {
    lines.push(m.role === "user" ? "## 🧑 Du" : "## 🤖 Partner");
    lines.push("");
    lines.push(m.content.trim());
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadMarkdown(filename: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "session";
}

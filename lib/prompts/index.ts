import { socraticPrompt } from "./socratic";
import { outlinePrompt } from "./outline";
import { proContraPrompt } from "./proContra";
import { mindmapPrompt } from "./mindmap";

export type ModeId = "socratic" | "outline" | "proContra" | "mindmap";

export interface Mode {
  id: ModeId;
  label: string;
  description: string;
  systemPrompt: string;
}

export const MODES: Record<ModeId, Mode> = {
  socratic: {
    id: "socratic",
    label: "Sokratisch",
    description: "Vertieft Ideen mit gezielten Rückfragen",
    systemPrompt: socraticPrompt,
  },
  outline: {
    id: "outline",
    label: "Outline",
    description: "Strukturiert rohe Gedanken zu klarem Outline",
    systemPrompt: outlinePrompt,
  },
  proContra: {
    id: "proContra",
    label: "Pro / Contra",
    description: "Devil's Advocate, deckt blinde Flecken auf",
    systemPrompt: proContraPrompt,
  },
  mindmap: {
    id: "mindmap",
    label: "Mindmap",
    description: "Clustert Ideen in Themenbaum",
    systemPrompt: mindmapPrompt,
  },
};

export const MODE_LIST: Mode[] = Object.values(MODES);

export function getMode(id: ModeId): Mode {
  const m = MODES[id];
  if (!m) throw new Error(`Unknown mode: ${id}`);
  return m;
}

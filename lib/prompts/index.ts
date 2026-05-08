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
  examples: string[];
}

export const MODES: Record<ModeId, Mode> = {
  socratic: {
    id: "socratic",
    label: "Sokratisch",
    description: "Vertieft Ideen mit gezielten Rückfragen",
    systemPrompt: socraticPrompt,
    examples: [
      "Ich überlege, mich selbstständig zu machen.",
      "Ich will weniger Zeit am Handy verbringen, schaffe es aber nicht.",
      "Mein Team ist demotiviert und ich weiß nicht warum.",
    ],
  },
  outline: {
    id: "outline",
    label: "Outline",
    description: "Strukturiert rohe Gedanken zu klarem Outline",
    systemPrompt: outlinePrompt,
    examples: [
      "Ich will einen Vortrag über produktives Arbeiten halten — hilf mir mit der Struktur.",
      "Ich plane einen Newsletter über Bauen mit AI. Welche Sektionen brauche ich?",
      "Brainstorm-Notizen für eine Mitarbeiter-Onboarding-Seite.",
    ],
  },
  proContra: {
    id: "proContra",
    label: "Pro / Contra",
    description: "Devil's Advocate, deckt blinde Flecken auf",
    systemPrompt: proContraPrompt,
    examples: [
      "Ich will meinen Job kündigen und ein Café eröffnen.",
      "Wir sollten unsere App komplett von Next.js auf Remix umstellen.",
      "Ich überlege, zu Vier-Tage-Woche im Team zu wechseln.",
    ],
  },
  mindmap: {
    id: "mindmap",
    label: "Mindmap",
    description: "Clustert Ideen in Themenbaum",
    systemPrompt: mindmapPrompt,
    examples: [
      "Themen rund um Produktivität für Selbstständige.",
      "Mindmap zu: Was macht eine gute SaaS-Landingpage aus?",
      "Aspekte einer guten Brainstorming-Session.",
    ],
  },
};

export const MODE_LIST: Mode[] = Object.values(MODES);

export function getMode(id: ModeId): Mode {
  const m = MODES[id];
  if (!m) throw new Error(`Unknown mode: ${id}`);
  return m;
}

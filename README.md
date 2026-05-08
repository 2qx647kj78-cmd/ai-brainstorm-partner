# 🧠 AI Brainstorm Partner

Eine Voicepal-inspirierte Web-App, die als Brainstorming-Partner arbeitet — mit
**Ollama** (lokal), **Anthropic Claude** und **OpenAI / ChatGPT** als
austauschbaren LLM-Backends.

## Features (Phase 1 / MVP)

- **Voice + Text Input**: Mikro-Aufnahme im Browser, Transkription via Whisper
- **3 LLM-Provider**: Ollama (lokal, kostenlos), Claude, OpenAI — frei wählbar
- **4 Brainstorming-Modi** mit dedizierten System-Prompts:
  - **Sokratisch** — vertieft Ideen mit gezielten Rückfragen
  - **Outline** — strukturiert rohe Gedanken zu klarem Outline
  - **Pro / Contra** — Devil's Advocate, deckt blinde Flecken auf
  - **Mindmap** — clustert Ideen in einen Themenbaum
- **Streaming**: Antworten erscheinen Token für Token
- **Backend-Proxy**: API-Keys leben nur server-seitig, nie im Browser

## Tech-Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- LLM-SDKs: `@anthropic-ai/sdk`, `openai`, `ollama`
- (Optional) Supabase für Auth & Session-Persistenz

## Setup

### 1. Dependencies

```bash
pnpm install
```

### 2. Environment Variables

```bash
cp .env.local.example .env.local
```

Trage in `.env.local` mindestens **einen** Provider ein:

- **Ollama** (empfohlen für lokales Testen, kostenlos): `OLLAMA_BASE_URL=http://localhost:11434`
- **Claude**: `ANTHROPIC_API_KEY=sk-ant-...`
- **OpenAI** (auch für Whisper-Transkription nötig): `OPENAI_API_KEY=sk-...`

### 3. Ollama lokal (optional, aber empfohlen)

```bash
# Install: https://ollama.com/download
ollama serve
ollama pull llama3.2          # oder: qwen2.5, mistral, gemma2 …
```

### 4. App starten

```bash
pnpm dev
```

→ http://localhost:3000

## Modi nutzen

1. Modus wählen (oben rechts): Sokratisch / Outline / Pro-Contra / Mindmap
2. Provider + Modell wählen
3. Mikrofon drücken oder einfach lostippen
4. Stop drücken → Transkription erscheint im Eingabefeld → Senden

## Auth & Persistenz

Standardmäßig läuft die App im **Single-User-Dev-Mode** ohne Login (sobald
Supabase-Env-Vars fehlen). Für Multi-User mit gespeicherten Sessions:

1. Supabase-Projekt anlegen (https://supabase.com)
2. SQL aus `supabase/migrations/0001_init.sql` im SQL-Editor ausführen
3. URL + Anon-/Publishable-Key in `.env.local` setzen:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```
4. App neu starten → Login-Seite (Magic-Link per E-Mail) erscheint automatisch

Sessions + Messages werden persistiert (RLS aktiv: jeder User sieht nur eigene
Daten). Sidebar links zeigt vergangene Sessions, klickbar zum Weiterführen.

## Architektur

```
Browser (Next.js Client)
   │
   ▼
Next.js API Routes (Server, hält API-Keys)
   ├─ /api/chat       → LLM-Provider (streaming)
   ├─ /api/transcribe → OpenAI Whisper
   └─ /api/models     → listet Modelle pro Provider
   │
   ├──▶ Ollama (lokal)
   ├──▶ Anthropic Claude
   └──▶ OpenAI
```

Kern-Abstraktion: `lib/llm/types.ts` definiert ein einheitliches `LLMProvider`-Interface.
Neue Provider sind ein Drop-in unter `lib/llm/<name>.ts`.

System-Prompts pro Modus liegen unter `lib/prompts/`. Einfach editierbar — kein
Prompt-Bloat im UI-Code.

## Roadmap

- [x] **Phase 1**: Multi-Provider, Streaming, Voice-Input, alle 4 Modi
- [x] **Phase 2**: Supabase Auth (Magic-Link) + Session-Persistenz + Sidebar
- [x] **Phase 3**: Interaktive Mindmap-Visualisierung + Markdown-Export
- [ ] **Phase 4**: Audio-Storage in Supabase, Session-Suche

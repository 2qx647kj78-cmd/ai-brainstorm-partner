import { getProvider, type ProviderName } from "./index";

const TITLE_SYSTEM_PROMPT = `You generate concise titles for brainstorming sessions.
Rules:
- 3 to 6 words.
- No quotes, no trailing punctuation.
- Match the language of the user's input (German if German, English if English).
- Be specific to the topic, not generic ("Brainstorming Session").
- Output ONLY the title text, nothing else.`;

export async function generateTitle(args: {
  provider: ProviderName;
  model: string;
  userMessage: string;
  assistantMessage: string;
  signal?: AbortSignal;
}): Promise<string | null> {
  try {
    const provider = getProvider(args.provider);
    let out = "";
    for await (const chunk of provider.stream({
      model: args.model,
      system: TITLE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `User:\n${args.userMessage.slice(0, 1000)}\n\nAssistant:\n${args.assistantMessage.slice(0, 1500)}\n\nTitle:`,
        },
      ],
      signal: args.signal,
    })) {
      out += chunk;
      if (out.length > 200) break;
    }
    const cleaned = out
      .trim()
      .split("\n")[0]
      .replace(/^["'„"]+|["'""]+$/g, "")
      .replace(/[.!?]+$/, "")
      .trim()
      .slice(0, 80);
    return cleaned || null;
  } catch {
    return null;
  }
}

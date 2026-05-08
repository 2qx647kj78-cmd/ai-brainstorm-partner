import { NextRequest } from "next/server";
import OpenAI from "openai";
import { requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _client: OpenAI | null = null;
function client() {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set (needed for Whisper)");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    return Response.json(
      { error: "Invalid form data: " + (err as Error).message },
      { status: 400 },
    );
  }

  const audio = form.get("audio");
  if (audio == null || typeof audio === "string" || !(audio instanceof Blob)) {
    return Response.json({ error: "Missing audio file" }, { status: 400 });
  }
  const blob = audio as Blob;
  const file =
    blob instanceof File
      ? blob
      : new File([blob], "recording.webm", { type: blob.type || "audio/webm" });

  try {
    const result = await client().audio.transcriptions.create({
      file,
      model: "whisper-1",
    });
    return Response.json({ text: result.text });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

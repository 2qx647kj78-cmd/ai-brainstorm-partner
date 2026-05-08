import { NextRequest } from "next/server";
import { getProvider, PROVIDER_NAMES, type ProviderName } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providerParam = searchParams.get("provider") as ProviderName | null;

  if (providerParam) {
    if (!PROVIDER_NAMES.includes(providerParam)) {
      return Response.json({ error: "Unknown provider" }, { status: 400 });
    }
    try {
      const models = await getProvider(providerParam).listModels();
      return Response.json({ provider: providerParam, models });
    } catch (err) {
      return Response.json(
        {
          provider: providerParam,
          models: [],
          error: err instanceof Error ? err.message : String(err),
        },
        { status: 200 },
      );
    }
  }

  const out: Record<string, { models: string[]; error?: string }> = {};
  await Promise.all(
    PROVIDER_NAMES.map(async (name) => {
      try {
        const models = await getProvider(name).listModels();
        out[name] = { models };
      } catch (err) {
        out[name] = {
          models: [],
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );
  return Response.json(out);
}

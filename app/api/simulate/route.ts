import { checkRateLimit } from "@vercel/firewall";
import { after } from "next/server";
import { start } from "workflow/api";
import { simulateBracket } from "@/workflows/simulate-bracket";
import { BRACKET_2026 } from "@/lib/bracket-data";
import type { SimulatedBracket } from "@/lib/bracket-data";
import { saveSimulationResults } from "@/lib/leaderboard";

export const maxDuration = 500;

const RATE_LIMIT_ID = "update-object";

async function trySaveResults(result: SimulatedBracket) {
  try {
    await saveSimulationResults(result);
  } catch (e) {
    console.error("Failed to save leaderboard results:", e);
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { rateLimited } = await checkRateLimit(RATE_LIMIT_ID, { request });
  if (rateLimited) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { stream?: boolean } = {};
  try {
    body = await request.json();
  } catch {}
  const stream = body.stream ?? true;

  const run = await start(simulateBracket, [BRACKET_2026]);

  if (stream) {
    after(async () => {
      try {
        const result = await run.returnValue;
        await trySaveResults(result);
      } catch (e) {
        console.error("Leaderboard save after streamed workflow:", e);
      }
    });
    return new Response(run.readable, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
      },
    });
  }

  const result = await run.returnValue;
  await trySaveResults(result);
  return Response.json({ message: "Simulation complete", result });
}

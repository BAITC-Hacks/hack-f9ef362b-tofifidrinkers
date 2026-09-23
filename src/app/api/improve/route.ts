import { NextRequest, NextResponse } from "next/server";
import { calculateScenario, Decision, validateScenario } from "@/lib/engine";
import { findBestSingleSwap } from "@/lib/improve";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const decisions: Decision[] = body?.decisions ?? [];

  const validation = validateScenario(decisions);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason ?? "Сценарий невалиден." }, { status: 400 });
  }

  const current = calculateScenario(decisions);
  if (!current.valid) {
    return NextResponse.json({ error: current.reason ?? "Сценарий невалиден." }, { status: 400 });
  }

  const suggestion = findBestSingleSwap(decisions);
  return NextResponse.json({ currentScore: current.score, suggestion });
}

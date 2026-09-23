import { NextRequest, NextResponse } from "next/server";
import { calculateScenario, Decision } from "@/lib/engine";
import { explainScenario } from "@/lib/explain";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const decisions: Decision[] = body?.decisions ?? [];

  const scenario = calculateScenario(decisions);
  if (!scenario.valid) {
    return NextResponse.json({ error: scenario.reason ?? "Сценарий невалиден." }, { status: 400 });
  }

  const result = await explainScenario(decisions, scenario);
  return NextResponse.json(result);
}

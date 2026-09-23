import { NextRequest, NextResponse } from "next/server";
import { calculateScenario, Decision } from "@/lib/engine";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const decisions: Decision[] = body?.decisions ?? [];
  const result = calculateScenario(decisions);
  return NextResponse.json(result);
}

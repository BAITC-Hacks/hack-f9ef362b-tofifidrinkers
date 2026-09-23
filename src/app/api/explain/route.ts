import { NextRequest, NextResponse } from "next/server";
import { calculateScenario, Decision } from "@/lib/engine";
import { explainScenario } from "@/lib/explain";

import { explainReport } from "@/lib/finalReport";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const decisions: Decision[] = body?.decisions ?? [];

  const scenario = calculateScenario(decisions);
  if (!scenario.valid) {
    return NextResponse.json(
      { error: scenario.reason ?? "Сценарий невалиден." },
      { status: 400 },
    );
  }

  if (body?.format === "report") {
    if (!["ru", "kk", "en"].includes(body.language)) {
      return NextResponse.json(
        { error: "Unsupported report language" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      await explainReport(decisions, scenario, body.language),
    );
  }
  const result = await explainScenario(decisions, scenario);
  return NextResponse.json(result);
}

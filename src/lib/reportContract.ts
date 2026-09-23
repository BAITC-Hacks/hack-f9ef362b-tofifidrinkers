import type { Locale } from "@/components/game/i18n";

export interface ReportNarrative {
  summary: string;
  quality: string;
  priority: string;
  reach: string;
  budget: string;
  strengths: string[];
  tradeoffs: string[];
  nextStep: string;
}
export interface FinalReportResult {
  format: "report";
  language: Locale;
  source: "anthropic" | "openai" | "offline-template";
  narrative: ReportNarrative | null;
  fallbackReason?: "not-configured" | "provider-unavailable";
}

export function parseReport(text: string): ReportNarrative {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object") throw new Error("Invalid report");
  const v = value as Record<string, unknown>;
  // Numbers belong to engine-backed UI, never to generated prose. No monetary parsing/conversion.
  const prose = (x: unknown): x is string =>
    typeof x === "string" &&
    x.trim().length > 0 &&
    x.length <= 1200 &&
    !/[\p{N}₸$€£]/u.test(x);
  const fields = [
    "summary",
    "quality",
    "priority",
    "reach",
    "budget",
    "nextStep",
  ] as const;
  const lists = ["strengths", "tradeoffs"] as const;
  if (
    !fields.every((k) => prose(v[k])) ||
    !lists.every(
      (k) =>
        Array.isArray(v[k]) &&
        v[k].length > 0 &&
        v[k].length <= 4 &&
        v[k].every(prose),
    )
  )
    throw new Error("Invalid narrative fields");
  return Object.fromEntries(
    [...fields, ...lists].map((k) => [k, v[k]]),
  ) as unknown as ReportNarrative;
}

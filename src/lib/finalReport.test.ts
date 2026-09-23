import assert from "node:assert/strict";
import test from "node:test";
import { calculateScenario, computeBaseline, type Decision } from "./engine";
import { buildReportContext, explainReport } from "./finalReport";
import { parseReport } from "./reportContract";
import { findBestSingleSwap } from "./improve";
import { EXAMPLE } from "@/components/game/useGame";
import { POST } from "@/app/api/explain/route";
import { NextRequest } from "next/server";

const plans: Decision[][] = [
  EXAMPLE,
  EXAMPLE.map((d) =>
    d.measureId === "M5" ? { measureId: "M3", districtId: "nura" } : d,
  ),
  [
    { measureId: "M2" },
    { measureId: "M5", districtId: "almaty" },
    { measureId: "M8", districtId: "baikonur" },
    { measureId: "M9", districtId: "saryarka" },
    { measureId: "M12" },
  ],
];

test("report context preserves exact engine outcomes, every indicator, allocations and verified swap", () => {
  for (const decisions of plans) {
    const scenario = calculateScenario(decisions);
    assert(scenario.valid);
    for (const language of ["ru", "kk", "en"] as const) {
      const c = buildReportContext(decisions, scenario, language);
      assert.deepEqual(c.scenario, scenario);
      assert.deepEqual(c.baseline, computeBaseline());
      assert.equal(c.scenario.districts.length, 5);
      assert(c.scenario.districts.every((d) => d.indicators.length === 10));
      assert.equal(
        c.allocation.citywide +
          c.allocation.districts.reduce((sum, d) => sum + d.cost, 0),
        scenario.cost,
      );
      const swap = findBestSingleSwap(decisions);
      assert.deepEqual(
        c.verifiedSwap?.scenario ?? null,
        swap?.scenario ?? null,
      );
      assert.equal(c.names.projects.length, 14);
      if (swap)
        assert.equal(
          c.verifiedSwap!.allocation.citywide +
            c.verifiedSwap!.allocation.districts.reduce(
              (sum, d) => sum + d.cost,
              0,
            ),
          swap.scenario.cost,
        );
    }
  }
  const negative: Decision[] = [
    { measureId: "M9", districtId: "nura" },
    { measureId: "M11", districtId: "almaty" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M4", districtId: "saryarka" },
  ];
  const withLoss = calculateScenario(negative);
  assert(withLoss.valid);
  const negativeContext = buildReportContext(negative, withLoss, "ru");
  assert(
    negativeContext.scenario.districts.some((d) =>
      d.indicators.some((i) => i.delta < 0),
    ),
  );
  assert.deepEqual(negativeContext.scenario, withLoss);
  const control = calculateScenario(EXAMPLE);
  assert(control.valid);
  assert(Math.abs(control.score - 56.54306666666666) < 1e-5);

  assert.equal(findBestSingleSwap(plans[1]), null);
  const concentrated = calculateScenario(plans[1]);
  assert(concentrated.valid);
  assert.equal(
    buildReportContext(
      plans[1],
      concentrated,
      "ru",
    ).allocation.districts.filter((d) => d.cost > 0).length,
    1,
  );
  const spread = calculateScenario(plans[2]);
  assert(spread.valid);
  assert(spread.nCrit > 0);
  assert(
    spread.districts.filter(
      (d) => d.finalScore - d.baseScore > 0 && d.finalScore - d.baseScore < 1,
    ).length >= 2,
  );
});

const narrative = {
  summary: "Benefits are uneven.",
  quality: "The index rose.",
  priority: "Nura needs attention.",
  reach: "Compare every district.",
  budget: "Citywide spending is separate.",
  strengths: ["School access improved."],
  tradeoffs: ["Critical needs remain."],
  nextStep: "Review the verified replacement before applying it.",
};
test("structured output rejects missing fields, fake numeric ratings, money and technical IDs", () => {
  assert.deepEqual(parseReport(JSON.stringify(narrative)), narrative);
  for (const patch of [
    { summary: "87/100" },
    { budget: "950000000 ₸" },
    { nextStep: "Try M3" },
    { strengths: [] },
    { quality: null },
  ])
    assert.throws(() =>
      parseReport(JSON.stringify({ ...narrative, ...patch })),
    );
});

test("real route: legacy compatibility, report locales, validation, offline and mocked providers", async () => {
  const savedOpenAI = process.env.OPENAI_API_KEY,
    savedAnthropic = process.env.ANTHROPIC_API_KEY,
    originalFetch = globalThis.fetch;
  const request = (body: unknown) =>
    POST(
      new NextRequest("http://localhost/api/explain", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  try {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    globalThis.fetch = async () => {
      throw new Error("No network without keys");
    };
    const old = await request({ decisions: EXAMPLE });
    assert.equal(old.status, 200);
    assert.equal(typeof (await old.json()).explanation, "string");
    for (const language of ["ru", "kk", "en"]) {
      const res = await request({
        decisions: EXAMPLE,
        format: "report",
        language,
      });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), {
        format: "report",
        language,
        source: "offline-template",
        narrative: null,
        fallbackReason: "not-configured",
      });
    }
    assert.equal(
      (await request({ decisions: EXAMPLE, format: "report", language: "de" }))
        .status,
      400,
    );
    assert.equal(
      (await request({ decisions: [], format: "report", language: "ru" }))
        .status,
      400,
    );
    process.env.OPENAI_API_KEY = "test-only";
    globalThis.fetch = async (_url, init) => {
      const payload = JSON.parse(String(init?.body));
      const context = JSON.parse(payload.messages[1].content);
      assert.equal(context.scenario.cost, 95);
      assert.equal(context.verifiedSwap.scenario.cost, 100);
      assert(payload.messages[0].content.includes("English"));
      return Response.json({
        choices: [{ message: { content: JSON.stringify(narrative) } }],
      });
    };
    const success = await request({
      decisions: EXAMPLE,
      format: "report",
      language: "en",
    });
    assert.deepEqual((await success.json()).narrative, narrative);
    const scenario = calculateScenario(EXAMPLE);
    assert(scenario.valid);
    for (const bad of [
      "",
      "plain text",
      JSON.stringify({ ...narrative, quality: "Score 99" }),
    ]) {
      globalThis.fetch = async () =>
        Response.json({ choices: [{ message: { content: bad } }] });
      const result = await explainReport(EXAMPLE, scenario, "ru");
      assert.equal(result.source, "offline-template");
      assert.equal(result.narrative, null);
      assert.equal(result.fallbackReason, "provider-unavailable");
    }
    globalThis.fetch = async () => {
      throw new Error("Network failure");
    };
    assert.equal(
      (await explainReport(EXAMPLE, scenario, "kk")).source,
      "offline-template",
    );
    process.env.ANTHROPIC_API_KEY = "test-only";
    globalThis.fetch = async (url, init) => {
      assert(String(url).includes("anthropic"));
      const payload = JSON.parse(String(init?.body));
      assert(payload.system.includes("Kazakh"));
      return Response.json({ content: [{ text: JSON.stringify(narrative) }] });
    };
    assert.equal(
      (await explainReport(EXAMPLE, scenario, "kk")).source,
      "anthropic",
    );
  } finally {
    if (savedOpenAI === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = savedOpenAI;
    if (savedAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = savedAnthropic;
    globalThis.fetch = originalFetch;
  }
});

import assert from "node:assert/strict";
import { buildSummary, buildOfflineExplanation, explainScenario, PROVIDER_TIMEOUT_MS } from "./explain";
import { calculateScenario, type Decision } from "./engine";

const decisions: Decision[] = [
  { measureId: "M7", districtId: "nura" }, { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" }, { measureId: "M12" },
  { measureId: "M5", districtId: "saryarka" },
];

async function main() {
  const scenario = calculateScenario(decisions);
  assert(scenario.valid);
  const summary = buildSummary(decisions, scenario);
  assert.equal(summary.indicatorDefinitions.length, 10);
  assert.equal(summary.availableMeasures.length, 14);
  assert.equal(summary.rules.incompatibilities.length, 3);
  assert.equal(summary.verifiedImprovement?.score, 57.21);
  assert.equal(summary.verifiedImprovement?.scoreDelta, 0.66);
  assert.equal(summary.verifiedImprovement?.cost, 100);
  assert(summary.verifiedImprovement?.added.includes("Нура"));
  assert(summary.topGains.every((gain) => gain.delta > 0));
  const offline = buildOfflineExplanation(summary);
  assert(offline.includes("+3.99"));
  assert(offline.includes("57.21"));
  const optimized = decisions.map((d) => d.measureId === "M5"
    ? { measureId: "M3" as const, districtId: "nura" as const } : d);
  const optimizedResult = calculateScenario(optimized);
  assert(optimizedResult.valid);
  assert.equal(buildSummary(optimized, optimizedResult).verifiedImprovement, null);
  console.log("OK: names, rules, verified replacement, rounding, local optimum");

  const originalFetch = globalThis.fetch;
  const keys = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"] as const;
  const saved = keys.map((key) => process.env[key]);
  const warn = console.error;
  console.error = () => undefined;
  try {
    keys.forEach((key) => delete process.env[key]);
    globalThis.fetch = async () => { throw new Error("No network expected without keys"); };
    assert.equal((await explainScenario(decisions, scenario)).source, "offline-template");

    process.env.OPENAI_API_KEY = "test-only-not-a-real-key";
    globalThis.fetch = async (_url, options) => {
      assert(options?.signal instanceof AbortSignal);
      const payload = JSON.parse(String(options?.body));
      const input = JSON.parse(payload.messages[1].content);
      assert.equal(input.verifiedImprovement.cost, 100);
      assert.equal(input.indicatorDefinitions.length, 10);
      return Response.json({ choices: [{ message: { content: "Проверочный ответ" } }] });
    };
    assert.equal((await explainScenario(decisions, scenario)).source, "openai");
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: "   " } }] });
    assert.equal((await explainScenario(decisions, scenario)).source, "offline-template");

    process.env.ANTHROPIC_API_KEY = "test-only-not-a-real-key";
    const calls: string[] = [];
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      return String(url).includes("anthropic") ? new Response(null, { status: 503 })
        : Response.json({ choices: [{ message: { content: "Резервный провайдер" } }] });
    };
    assert.equal((await explainScenario(decisions, scenario)).source, "openai");
    assert.equal(calls.length, 2);
    delete process.env.ANTHROPIC_API_KEY;

    // Exercise the real timeout signal with a hanging provider, without network access.
    globalThis.fetch = async (_url, options) => new Promise<Response>((_resolve, reject) => {
      const signal = options?.signal;
      assert(signal);
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
    const keepAlive = setInterval(() => undefined, 1000);
    const start = Date.now();
    try {
      assert.equal((await explainScenario(decisions, scenario)).source, "offline-template");
      assert(Date.now() - start >= PROVIDER_TIMEOUT_MS - 100);
      assert(Date.now() - start < PROVIDER_TIMEOUT_MS + 5000);
    } finally { clearInterval(keepAlive); }
    console.log("OK: offline, mocked provider, empty response, provider fallback, real timeout");
    console.log("Live LLM NOT tested; all provider responses were simulated.");
  } finally {
    globalThis.fetch = originalFetch;
    console.error = warn;
    keys.forEach((key, index) => {
      if (saved[index] === undefined) delete process.env[key];
      else process.env[key] = saved[index];
    });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

"""HTTP acceptance checks. Run against a locally started application.

python3 fixtures/daniyal/verify_http.py http://127.0.0.1:3000
Add --offline-explanation only when the server has no provider keys.
No LLM requests are made by default. Uses only the Python standard library.
"""
import argparse
import json
import math
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def close(actual, expected):
    assert isinstance(actual, (int, float)) and not isinstance(actual, bool)
    assert math.isfinite(actual) and abs(actual - expected) <= 1e-8, (actual, expected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url")
    parser.add_argument("--offline-explanation", action="store_true")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    fixtures = json.loads(Path(__file__).with_name("scenario-fixtures.json").read_text())
    results = []

    def request(path, payload=None, raw=None):
        data = raw if raw is not None else json.dumps(payload).encode()
        req = Request(args.base_url.rstrip("/") + path, data=data,
                      headers={"Content-Type": "application/json"})
        try:
            response = urlopen(req, timeout=20)
        except HTTPError as error:
            response = error
        with response:
            status = response.status
            text = response.read().decode()
        assert status < 500, f"HTTP {status}: сервер упал на входных данных"
        try:
            body = json.loads(text)
        except ValueError:
            raise AssertionError(f"HTTP {status}: ответ не JSON") from None
        assert isinstance(body, dict), "Ответ должен быть объектом JSON"
        return status, body

    def check(name, fn):
        try:
            fn()
            results.append({"name": name, "ok": True})
            print("OK", name)
        except Exception as error:
            results.append({"name": name, "ok": False, "error": str(error)})
            print("FAIL", name, str(error))

    def scenario_case(case):
        status, body = request("/api/scenario", case["input"])
        expected = case["expected"]
        assert body.get("valid") is expected["valid"]
        if not expected["valid"]:
            assert body.get("code") in expected["violations"], body.get("code")
            assert body.get("score") is None
            return
        assert status == 200
        for key, target in [("score", "score"), ("cost", "cost"),
                            ("budgetLeft", "budgetRemaining"), ("dAvg", "averageScore"),
                            ("nCrit", "criticalCount")]:
            close(body[key], expected[target])
        assert sorted(body["worstDistrictIds"]) == sorted(expected["worstDistrictIds"])
        assert sorted(s["id"] for s in body["synergiesApplied"]) == sorted(expected["appliedSynergies"])
        districts = {d["districtId"]: d for d in body["districts"]}
        assert len(body["districts"]) == len(districts) == 5
        for district_id, values in expected["finalIndicators"].items():
            district = districts[district_id]
            close(district["finalScore"], expected["districtScores"][district_id])
            indicators = {i["indicator"]: i["final"] for i in district["indicators"]}
            assert len(district["indicators"]) == len(indicators) == 10
            for code, value in values.items():
                close(indicators[code], value)

    for case in fixtures["scenarios"]:
        check("scenario/" + case["id"], lambda case=case: scenario_case(case))

    official = next(c["input"]["decisions"] for c in fixtures["scenarios"]
                    if c["id"] == "official-example")

    def advisor_flow():
        status, body = request("/api/improve", {"decisions": official})
        assert status == 200
        close(body["currentScore"], 56.54307)
        suggestion = body["suggestion"]
        assert suggestion["removed"] == {"measureId": "M5", "districtId": "saryarka"}
        assert suggestion["added"] == {"measureId": "M3", "districtId": "nura"}
        close(suggestion["scoreDelta"], 0.66249)
        close(suggestion["costDelta"], 5)
        updated = [suggestion["added"] if d == suggestion["removed"] else d for d in official]
        status, calculated = request("/api/scenario", {"decisions": updated})
        assert status == 200 and calculated["valid"]
        close(calculated["score"], 57.20556)
        close(calculated["cost"], 100)
        # Ordering of contribution arrays may differ; compare numerical results.
        for district in calculated["districts"]:
            other = next(d for d in suggestion["scenario"]["districts"]
                         if d["districtId"] == district["districtId"])
            close(district["finalScore"], other["finalScore"])
            for indicator in district["indicators"]:
                counterpart = next(i for i in other["indicators"]
                                   if i["indicator"] == indicator["indicator"])
                close(indicator["final"], counterpart["final"])
        status, final = request("/api/improve", {"decisions": updated})
        assert status == 200 and final["suggestion"] is None

    check("improve/apply/recalculate/local-optimum", advisor_flow)

    def rejected(path, payload, raw=None):
        status, body = request(path, payload, raw)
        assert 400 <= status < 500 or (status == 200 and body.get("valid") is False), "Некорректный запрос был принят как допустимый"
        assert body.get("score") is None and "suggestion" not in body

    malformed = {
        "broken-json": (None, b"{"),
        "empty-body": ({}, None),
        "string-decisions": ({"decisions": "12345"}, None),
        "object-decisions": ({"decisions": {"length": 5}}, None),
        "null-decision": ({"decisions": [None] + official[1:]}, None),
        "number-measure": ({"decisions": [{"measureId": 7}] + official[1:]}, None),
        "prototype-measure": ({"decisions": [{"measureId": "toString"}] + official[1:]}, None),
        "boolean-city-district": ({"decisions": [dict(d, districtId=False)
             if d["measureId"] == "M12" else d for d in official]}, None),
    }
    for path in ("/api/scenario", "/api/improve", "/api/explain"):
        for name, (payload, raw) in malformed.items():
            # Skip a malformed value that current code may accept and send to a paid provider.
            if path == "/api/explain" and name == "boolean-city-district":
                continue
            check(path + "/" + name,
                  lambda path=path, payload=payload, raw=raw: rejected(path, payload, raw))

    if args.offline_explanation:
        def explanation():
            status, body = request("/api/explain", {"decisions": official})
            assert status == 200 and body["source"] == "offline-template"
            assert isinstance(body["explanation"], str) and len(body["explanation"]) > 100
            assert "56.54" in body["explanation"]
        check("explain/offline-template", explanation)

    failed = sum(not r["ok"] for r in results)
    report = {"passed": len(results) - failed, "failed": failed,
              "liveLLMTested": False, "results": results}
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"\nИтого: {len(results) - failed} успешно, {failed} ошибок.")
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()


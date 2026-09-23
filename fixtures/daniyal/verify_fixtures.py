"""Независимая проверка эталонов; не модуль backend. Python 3, без пакетов."""
import json
import sys
from collections import Counter
from decimal import Decimal as D
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def require(condition, message):
    if not condition:
        raise ValueError(message)

def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'), parse_float=D)

def clip(value):
    return max(D(0), min(D(100), value))

def compare(actual, expected, path='result'):
    if isinstance(expected, dict):
        require(isinstance(actual, dict) and actual.keys() == expected.keys(), path + ': разные поля')
        for key in expected:
            compare(actual[key], expected[key], path + '.' + key)
    elif isinstance(expected, list):
        require(isinstance(actual, list) and len(actual) == len(expected), path + ': разные длины')
        for i, (a, e) in enumerate(zip(actual, expected)):
            compare(a, e, path + '[' + str(i) + ']')
    else:
        require(actual == expected, f'{path}: {actual!r} != {expected!r}')

def check_data(data):
    for key, count in [('districts', 5), ('indicators', 10), ('measures', 14), ('directions', 5)]:
        rows = data[key]
        require(len(rows) == count and len({x['id'] for x in rows}) == count, key + ': количество/дубликат')
    require(sum(x['weight'] for x in data['indicators']) == 1, 'Сумма весов')
    require(sum(x['populationShare'] for x in data['districts']) == 1, 'Сумма населения')
    ids = {x['id'] for x in data['indicators']}
    directions = {x['id'] for x in data['directions']}
    measures = {x['id']: x for x in data['measures']}
    require(set(measures) == {'M' + str(i) for i in range(1, 15)}, 'ID мероприятий')
    require(ids == {'T1','T2','E1','E2','S1','S2','B1','B2','C1','C2'}, 'ID показателей')
    require({x['id'] for x in data['districts']} == {'esil','almaty','saryarka','baikonur','nura'}, 'ID районов')
    for x in data['indicators']:
        require(x['directionId'] in directions and 0 < x['weight'] <= 1, 'Показатель: направление/вес')
    for x in data['districts']:
        require(set(x['indicators']) == ids, 'Показатели района')
        require(0 < x['populationShare'] <= 1, 'Доля населения')
        require(all(0 <= v <= 100 for v in x['indicators'].values()), 'Шкала района')
    for x in measures.values():
        require(x['directionId'] in directions and set(x['effects']) <= ids, 'Ссылки мероприятия')
        require(x['scope'] in ('city', 'district'), 'Тип мероприятия')
        require(0 <= x['lagQuarters'] <= data['horizonQuarters'] and x['cost'] >= 0, 'Лаг/стоимость')
    require(len({x['id'] for x in data['synergies']}) == len(data['synergies']), 'ID синергий')
    for x in data['synergies']:
        require(len(x['measureIds']) == 2 and set(x['measureIds']) <= measures.keys(), 'Ссылки синергии')
        require(x['targetMeasureId'] in x['measureIds'] and measures[x['targetMeasureId']]['scope'] == 'district', 'Цель синергии')
        require(set(x['effects']) <= ids, 'Показатели синергии')
    for x in data['incompatibilities']:
        require(len(set(x['measureIds'])) == 2 and set(x['measureIds']) <= measures.keys(), 'Ссылки конфликта')
        require(x['scope'] in ('scenario', 'sameDistrict'), 'Область конфликта')

def violations(data, decisions):
    measures = {m['id']: m for m in data['measures']}
    districts = {d['id'] for d in data['districts']}
    errors = set()
    if len(decisions) != data['rules']['exactDecisionCount']:
        errors.add('DECISION_COUNT')
    counts = Counter(x['measureId'] for x in decisions)
    if any(v > 1 for v in counts.values()):
        errors.add('DUPLICATE_MEASURE')
    known = [x for x in decisions if x['measureId'] in measures]
    if len(known) != len(decisions):
        errors.add('UNKNOWN_MEASURE')
    if sum(measures[x['measureId']]['cost'] for x in known) > data['budget']:
        errors.add('BUDGET_EXCEEDED')
    if any(v > 2 for v in Counter(measures[x['measureId']]['directionId'] for x in known).values()):
        errors.add('DIRECTION_LIMIT')
    for x in known:
        scope = measures[x['measureId']]['scope']
        district = x.get('districtId')
        if scope == 'city' and district is not None:
            errors.add('CITY_DISTRICT_FORBIDDEN')
        if scope == 'district':
            if district is None:
                errors.add('DISTRICT_REQUIRED')
            elif district not in districts:
                errors.add('UNKNOWN_DISTRICT')
    for conflict in data['incompatibilities']:
        a, b = conflict['measureIds']
        if a not in counts or b not in counts:
            continue
        if conflict['scope'] == 'scenario':
            errors.add('INCOMPATIBLE_SCENARIO')
        elif any(x.get('districtId') == y.get('districtId') and x.get('districtId') in districts
                 for x in known if x['measureId'] == a for y in known if y['measureId'] == b):
            errors.add('INCOMPATIBLE_DISTRICT')
    return sorted(errors)

def calculate(data, decisions):
    """Вызывается только после валидации; [] разрешён отдельно для базы."""
    measures = {m['id']: m for m in data['measures']}
    values = {d['id']: {k: D(v) for k, v in d['indicators'].items()} for d in data['districts']}
    chosen = {x['measureId']: x.get('districtId') for x in decisions}
    for mid, district in chosen.items():
        m = measures[mid]
        factor = D(data['horizonQuarters'] - m['lagQuarters']) / data['horizonQuarters']
        for target in values if m['scope'] == 'city' else [district]:
            for key, effect in m['effects'].items():
                values[target][key] += effect * factor
    applied = []
    for synergy in data['synergies']:
        if all(mid in chosen for mid in synergy['measureIds']):
            target = chosen[synergy['targetMeasureId']]
            for key, effect in synergy['effects'].items():
                values[target][key] += effect
            applied.append(synergy['id'])
    scores, critical = {}, []
    formula = data['scoreFormula']
    for district, row in values.items():
        for key in row:
            row[key] = clip(row[key])
            if row[key] < formula['criticalThreshold']:
                critical.append(dict(districtId=district, indicatorId=key, value=row[key]))
        scores[district] = sum(row[k['id']] * k['weight'] for k in data['indicators'])
    avg = sum(scores[d['id']] * d['populationShare'] for d in data['districts'])
    minimum = min(scores.values())
    score = formula['averageWeight'] * avg + formula['minimumWeight'] * minimum - formula['criticalPenalty'] * len(critical)
    cost = sum(measures[x['measureId']]['cost'] for x in decisions)
    return dict(valid=True, violations=[], cost=cost, budgetRemaining=data['budget']-cost,
                finalIndicators=values, districtScores=scores, averageScore=avg, minimumScore=minimum,
                worstDistrictIds=[d for d in scores if scores[d] == minimum], criticalIndicators=critical,
                criticalCount=len(critical), score=score, delta=score-D('52.55768'), appliedSynergies=applied)

def main():
    data, fixtures = read('city-data.json'), read('scenario-fixtures.json')
    check_data(data)
    require(len({x['id'] for x in fixtures['scenarios']}) == len(fixtures['scenarios']), 'Дубликат ID сценария')
    base = calculate(data, [])
    compare(base['districtScores'], {d['id']: d['referenceScore'] for d in data['districts']}, 'Оценки из документа')
    compare(base['averageScore'], D('56.8624'), 'Средняя база')
    compare(base['score'], D('52.55768'), 'Score базы')
    require(base['criticalCount'] == 2, 'Критические значения базы')
    base.pop('valid'); base.pop('violations')
    compare(base, fixtures['baseline']['expected'], 'baseline')
    results = {}
    for case in fixtures['scenarios']:
        errors = violations(data, case['input']['decisions'])
        result = dict(valid=False, violations=errors, score=None) if errors else calculate(data, case['input']['decisions'])
        compare(result, case['expected'], case['id'])
        results[case['id']] = result
    for case in fixtures['scenarios']:
        if 'equivalentTo' in case:
            compare(results[case['id']], results[case['equivalentTo']], 'Перестановка')
    for case in fixtures['unitChecks']:
        op, value = case['operation'], case['input']
        if op == 'clip':
            actual = clip(value)
        elif op == 'clipSum':
            actual = clip(sum(value))
        elif op == 'isCritical':
            actual = value < data['scoreFormula']['criticalThreshold']
        else:
            raise ValueError('Неизвестная unit-операция: ' + op)
        compare(actual, case['expected'], case['id'])
    # Независимые фиксированные ориентиры, рассчитанные вручную.
    official = results['official-example']
    compare(official['score'], D('56.54307'), 'Официальный пример')
    compare(official['delta'], D('3.98539'), 'Прирост')
    compare(official['finalIndicators']['nura']['S1'], D('48'), '38 + 16*5/8')
    compare(official['finalIndicators']['nura']['S2'], D('43.75'), '35 + 14*5/8')
    compare(official['finalIndicators']['nura']['B1'], D('67.5'), '55 + 12*7/8 + 2')
    for district in data['districts']:
        compare(official['finalIndicators'][district['id']]['C2'], D(district['indicators']['C2']) + D('4.375'), 'Городской M12')
    compare(official['finalIndicators']['esil']['S1'], D(48), 'Районный M7 не меняет Есиль')
    compare(results['cheap-valid']['cost'], 61, 'Дешёвый набор')
    compare(results['cheap-valid']['finalIndicators']['almaty']['T1'], D('38.25'), '40 - 2*7/8')
    compare(results['synergy-transport']['finalIndicators']['nura']['T1'], D('64.5'), '55 + 6*.75 + 4*.75 + 2')
    compare(results['synergy-ecology']['finalIndicators']['saryarka']['E2'], D('52.25'), '40 + 14*.625 + 3*.5 + 2')
    compare(results['lrt-lag']['finalIndicators']['nura']['T2'], D(50), '40 + 20*.5')
    require(not any(x['districtId'] == 'nura' and x['indicatorId'] == 'T2' for x in base['criticalIndicators']), 'Ровно 40 не критично')
    print(f"OK: данные; база; {len(results)} сценария; {len(fixtures['unitChecks'])} граничных проверок; ручные арифметические ориентиры.")
    print('Score базы 52.55768; контрольный Score 56.54307; прирост 3.98539 (на экране +3.99).')
    print('Работающий сервер не проверялся: это независимый проверочный комплект.')

if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('FAIL:', exc, file=sys.stderr)
        sys.exit(1)

// Run with: npx tsx tests/systemicStress.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { Microservice } from '../types';
import {
  assessSystemicStress,
  clamp01,
  domainSignals,
  readAplMetadata,
  systemicScore,
} from '../services/systemicStress';

const close = (a: number, b: number, tol = 1e-3) =>
  assert.ok(Math.abs(a - b) < tol, `expected ${b}, got ${a}`);

const agent = (id: string, domain?: string, score?: number, threshold = 0.7): Microservice => ({
  id, name: id, description: '', endpoints: [], isAgentic: true, usageCount: 0, owaspRisks: [],
  ...(domain ? { domain } : {}),
  ...(score !== undefined ? { stress: { score, threshold, source: 'manual' as const } } : {}),
});

// 1. Paper worked example: 0.60, 0.55, 0.58 -> 0.924, no local alert.
{
  const a = assessSystemicStress([
    agent('pv', 'Pharmacovigilance', 0.60),
    agent('sc', 'Supply Chain', 0.55),
    agent('qa', 'Quality Assurance', 0.58),
  ], 0.9);
  close(a.probabilityAllStable, 0.0756, 1e-4);
  close(a.systemicScore, 0.9244, 1e-4);
  assert.equal(a.localAlertCount, 0);
  assert.equal(a.systemicAlert, true);
  assert.equal(a.hiddenSystemic, true);
  console.log(`worked example: S_sys = ${a.systemicScore.toFixed(4)}, hidden systemic = ${a.hiddenSystemic}`);
}

// 2. Scaling: s = 0.5, n = 5 -> 0.969.
{
  const s = systemicScore([0.5, 0.5, 0.5, 0.5, 0.5]);
  close(s, 0.96875, 1e-5);
  console.log(`scaling n=5, s=0.5: S_sys = ${s.toFixed(5)}`);
}

// 3. Same domain counted once (max), and a local alert suppresses "hidden".
{
  const a = assessSystemicStress([
    agent('pv1', 'Pharmacovigilance', 0.30),
    agent('pv2', 'Pharmacovigilance', 0.80),
    agent('sc', 'Supply Chain', 0.50),
  ], 0.9);
  assert.equal(a.domains.length, 2);
  close(a.domains[0].score, 0.80);
  assert.equal(a.localAlertCount, 1);
  close(a.systemicScore, 1 - 0.2 * 0.5);
  assert.equal(a.hiddenSystemic, false);
  console.log(`domain collapse: 2 domains, S_sys = ${a.systemicScore.toFixed(2)}, local alerts = 1`);
}

// 4. Agents without domain/score are ignored; empty -> no alert.
{
  const a = assessSystemicStress([agent('x'), agent('y', 'Supply Chain')]);
  assert.equal(a.domains.length, 0);
  assert.equal(a.systemicScore, 0);
  assert.equal(a.systemicAlert, false);
}

// 5. Metadata parsing from the bundled samples.
{
  const multi: any = yaml.load(readFileSync(new URL('../samples/pharma-ops-services.yaml', import.meta.url), 'utf8'));
  const metas = multi.services.map((s: any) => readAplMetadata(s));
  assert.deepEqual(metas.map((m: any) => m.domain), ['Pharmacovigilance', 'Supply Chain', 'Quality Assurance']);
  assert.deepEqual(metas.map((m: any) => m.stress.score), [0.6, 0.55, 0.58]);

  const oas: any = yaml.load(readFileSync(new URL('../samples/openapi-serialisation.yaml', import.meta.url), 'utf8'));
  const m = readAplMetadata(oas);
  assert.equal(m.domain, 'Regulatory Affairs');
  close(m.stress!.score, 0.4);

  // Four domains incl. Regulatory Affairs at 0.40
  const four = systemicScore([0.6, 0.55, 0.58, 0.4]);
  close(four, 1 - 0.0756 * 0.6, 1e-4);
  console.log(`samples parsed; 4 domains: S_sys = ${four.toFixed(4)}`);
}

// 6. Clamping of out-of-range scores.
{
  const m = readAplMetadata({ 'x-apl': { domain: 'QA', stressScore: 1.7, threshold: -1 } });
  assert.equal(m.stress!.score, 1);
  assert.equal(m.stress!.threshold, 0);
}

// 7. Boundary values, invalid numbers, and empty-domain probability.
{
  assert.equal(clamp01(Number.NaN), 0);
  assert.equal(clamp01(Number.POSITIVE_INFINITY), 0);
  assert.equal(clamp01(-0.1), 0);
  assert.equal(clamp01(1.1), 1);
  assert.equal(systemicScore([]), 0);
  assert.equal(systemicScore([0, 0]), 0);
  assert.equal(systemicScore([1, 0.5]), 1);

  const empty = assessSystemicStress([], 0);
  assert.equal(empty.systemicAlert, false);
  assert.equal(empty.probabilityAllStable, 1);
}

// 8. Exact threshold is an alert; domain aggregation uses the strictest threshold.
{
  const signals = domainSignals([
    agent('a1', 'Payments', 0.6, 0.8),
    agent('a2', 'Payments', 0.2, 0.6),
  ]);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].score, 0.6);
  assert.equal(signals[0].threshold, 0.6);
  assert.equal(signals[0].localAlert, true);

  const assessment = assessSystemicStress([agent('exact', 'Exact', 0.9)], 0.9);
  assert.equal(assessment.systemicAlert, true);
  assert.equal(assessment.hiddenSystemic, false);
  assert.equal(assessment.localAlertCount, 1);
}

// 9. Metadata supports legacy aliases, missing score, defaults, and malformed values.
{
  assert.deepEqual(readAplMetadata(null), {});
  assert.deepEqual(readAplMetadata({ 'x-apl-domain': 'Legacy' }), { domain: 'Legacy' });

  const metadata = readAplMetadata({
    domain: 'Legacy',
    'x-apl-stress-score': '0.25',
    'x-apl-threshold': 'invalid',
  });
  assert.deepEqual(metadata.stress, {
    score: 0.25,
    threshold: 0.7,
    source: 'manifest',
  });

  assert.deepEqual(readAplMetadata({ domain: 'No score', stressScore: 'invalid' }), {
    domain: 'No score',
  });
}

console.log('All systemic stress tests passed.');

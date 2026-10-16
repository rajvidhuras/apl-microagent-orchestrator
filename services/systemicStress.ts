import { Microservice } from '../types';

/**
 * Systemic stress scoring for promoted micro-agents.
 *
 * Each promoted agent may carry a domain label and a domain stress score
 * S_i in [0, 1], with a domain-local alert threshold tau_i. Under the
 * independence assumption, the probability that every domain stays stable is
 *
 *   P(all stable) = prod_i (1 - S_i)
 *
 * and the systemic stress score is its complement
 *
 *   S_sys = 1 - prod_i (1 - S_i)
 *
 * A "hidden systemic" condition is one where S_sys >= tau_sys while no
 * individual domain has crossed its own threshold. That is the case
 * domain-local monitoring cannot see.
 *
 * Limitations:
 *  - Independence is assumed. Correlated domains need a copula-based model.
 *  - S_sys rises with the number of domains, so tau_sys must be calibrated
 *    against the domain count to avoid false alarms.
 *  - Scores must be comparable across domains (normalisation is not validated here).
 */

export const DEFAULT_DOMAIN_THRESHOLD = 0.7;
export const DEFAULT_SYSTEMIC_THRESHOLD = 0.9;

export interface DomainSignal {
  domain: string;
  score: number;      // S_i, aggregated over the domain's agents
  threshold: number;  // tau_i
  agentIds: string[];
  localAlert: boolean;
}

export interface SystemicAssessment {
  domains: DomainSignal[];
  probabilityAllStable: number;
  systemicScore: number;       // S_sys
  systemicThreshold: number;   // tau_sys
  systemicAlert: boolean;
  hiddenSystemic: boolean;     // systemic alert with no local alert
  localAlertCount: number;
  assessedAt: number;
}

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/** S_sys = 1 - prod(1 - S_i). Empty input gives 0. */
export function systemicScore(scores: number[]): number {
  const stable = scores.reduce((acc, s) => acc * (1 - clamp01(s)), 1);
  return 1 - stable;
}

/**
 * Collapse agents into one signal per domain.
 * Several agents in the same domain are combined with max(), the
 * conservative choice, so one domain is never counted more than once.
 * The domain threshold is the lowest threshold declared by its agents.
 */
export function domainSignals(agents: Microservice[]): DomainSignal[] {
  const byDomain = new Map<string, DomainSignal>();
  for (const a of agents) {
    if (!a.domain || !a.stress) continue;
    const score = clamp01(a.stress.score);
    const threshold = clamp01(a.stress.threshold ?? DEFAULT_DOMAIN_THRESHOLD);
    const existing = byDomain.get(a.domain);
    if (!existing) {
      byDomain.set(a.domain, {
        domain: a.domain,
        score,
        threshold,
        agentIds: [a.id],
        localAlert: false,
      });
    } else {
      existing.score = Math.max(existing.score, score);
      existing.threshold = Math.min(existing.threshold, threshold);
      existing.agentIds.push(a.id);
    }
  }
  const signals = Array.from(byDomain.values());
  for (const d of signals) d.localAlert = d.score >= d.threshold;
  return signals.sort((x, y) => y.score - x.score);
}

export function assessSystemicStress(
  agents: Microservice[],
  systemicThreshold: number = DEFAULT_SYSTEMIC_THRESHOLD,
): SystemicAssessment {
  const domains = domainSignals(agents);
  const sys = systemicScore(domains.map(d => d.score));
  const localAlertCount = domains.filter(d => d.localAlert).length;
  const systemicAlert = domains.length > 0 && sys >= systemicThreshold;
  return {
    domains,
    probabilityAllStable: 1 - sys,
    systemicScore: sys,
    systemicThreshold,
    systemicAlert,
    hiddenSystemic: systemicAlert && localAlertCount === 0,
    localAlertCount,
    assessedAt: Date.now(),
  };
}

/** Read APL metadata from a parsed definition (OpenAPI info, or a service entry). */
export function readAplMetadata(raw: any): Pick<Microservice, 'domain' | 'stress'> {
  if (!raw || typeof raw !== 'object') return {};
  const src = raw.info && typeof raw.info === 'object' ? { ...raw, ...raw.info } : raw;
  const apl = src['x-apl'] && typeof src['x-apl'] === 'object' ? src['x-apl'] : {};
  const domain = apl.domain ?? src['x-apl-domain'] ?? src.domain;
  const scoreRaw = apl.stressScore ?? src['x-apl-stress-score'] ?? src.stressScore;
  const thrRaw = apl.threshold ?? src['x-apl-threshold'] ?? src.threshold;
  const score = scoreRaw === undefined ? undefined : Number(scoreRaw);
  if (!domain) return {};
  if (score === undefined || Number.isNaN(score)) return { domain: String(domain) };
  const threshold = thrRaw === undefined ? undefined : Number(thrRaw);
  return {
    domain: String(domain),
    stress: {
      score: clamp01(score),
      threshold: threshold === undefined || Number.isNaN(threshold) ? DEFAULT_DOMAIN_THRESHOLD : clamp01(threshold),
      source: 'manifest',
    },
  };
}

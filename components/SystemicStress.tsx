import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Sigma } from 'lucide-react';
import { Microservice } from '../types';
import {
  assessSystemicStress,
  DEFAULT_DOMAIN_THRESHOLD,
  DEFAULT_SYSTEMIC_THRESHOLD,
  SystemicAssessment,
} from '../services/systemicStress';

interface SystemicStressProps {
  agents: Microservice[];
  onUpdateAgent: (agentId: string, patch: Partial<Microservice>) => void;
}

const SUGGESTED_DOMAINS = [
  'Pharmacovigilance',
  'Quality Assurance',
  'Supply Chain',
  'Clinical Development',
  'Regulatory Affairs',
];

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export const SystemicStress: React.FC<SystemicStressProps> = ({ agents, onUpdateAgent }) => {
  const [systemicThreshold, setSystemicThreshold] = useState(DEFAULT_SYSTEMIC_THRESHOLD);
  const [history, setHistory] = useState<SystemicAssessment[]>([]);

  const assessment = useMemo(
    () => assessSystemicStress(agents, systemicThreshold),
    [agents, systemicThreshold],
  );

  const unassigned = agents.filter(a => !a.domain || !a.stress);

  const setDomainScore = (agentIds: string[], score: number) => {
    agentIds.forEach(id => {
      const a = agents.find(x => x.id === id);
      if (!a?.stress) return;
      onUpdateAgent(id, { stress: { ...a.stress, score, source: 'manual' } });
    });
  };

  const assign = (agent: Microservice, domain: string) => {
    if (!domain) return;
    onUpdateAgent(agent.id, {
      domain,
      stress: agent.stress ?? { score: 0, threshold: DEFAULT_DOMAIN_THRESHOLD, source: 'manual' },
    });
  };

  const record = () => setHistory(h => [{ ...assessment, assessedAt: Date.now() }, ...h].slice(0, 20));

  const banner = assessment.domains.length === 0
    ? { cls: 'bg-slate-50 border-slate-200 text-slate-600', icon: <Activity size={20} />, text: 'No domain signals yet. Assign a domain to at least one agent, or upload a definition with x-apl metadata.' }
    : assessment.hiddenSystemic
      ? { cls: 'bg-red-50 border-red-300 text-red-800', icon: <AlertTriangle size={20} />, text: 'Hidden systemic stress: no domain has crossed its own threshold, but the joint score has. Domain-local monitoring would not raise this.' }
      : assessment.systemicAlert
        ? { cls: 'bg-amber-50 border-amber-300 text-amber-800', icon: <AlertTriangle size={20} />, text: `Systemic alert, with ${assessment.localAlertCount} domain alert(s) also raised locally.` }
        : { cls: 'bg-emerald-50 border-emerald-300 text-emerald-800', icon: <CheckCircle2 size={20} />, text: 'Joint score below the systemic threshold.' };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Systemic Stress</h2>
        <p className="text-slate-600 text-sm">
          Joint-probability view across promoted agents. Each domain reports a score S<sub>i</sub>; the systemic score is
          S<sub>sys</sub> = 1 − ∏(1 − S<sub>i</sub>), assuming independence between domains.
        </p>
      </div>

      <div className={`flex items-start gap-3 p-4 rounded-xl border ${banner.cls}`}>
        {banner.icon}
        <span className="text-sm font-medium">{banner.text}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Domain signals */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <h3 className="font-semibold text-slate-900">Domain signals</h3>
          {assessment.domains.map(d => (
            <div key={d.domain}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-800">
                  {d.domain} <span className="text-slate-400 font-normal">({d.agentIds.length} agent{d.agentIds.length > 1 ? 's' : ''})</span>
                </span>
                <span className={d.localAlert ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                  S = {d.score.toFixed(2)} · τ = {d.threshold.toFixed(2)} {d.localAlert ? '· LOCAL ALERT' : ''}
                </span>
              </div>
              <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${d.localAlert ? 'bg-red-500' : 'bg-sky-500'}`}
                  style={{ width: pct(d.score) }}
                />
                <div className="absolute top-0 h-full w-0.5 bg-slate-800" style={{ left: pct(d.threshold) }} title="domain threshold" />
              </div>
              <input
                type="range" min={0} max={1} step={0.01} value={d.score}
                onChange={e => setDomainScore(d.agentIds, Number(e.target.value))}
                className="w-full mt-1 accent-sky-600"
                aria-label={`${d.domain} stress score`}
              />
            </div>
          ))}

          {unassigned.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Agents without a domain</h4>
              <div className="space-y-2">
                {unassigned.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700 truncate">{a.name}</span>
                    <select
                      className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                      defaultValue=""
                      onChange={e => assign(a, e.target.value)}
                    >
                      <option value="" disabled>Assign domain…</option>
                      {SUGGESTED_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Joint score */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Sigma size={18} /> Joint score</h3>
          <div className="text-center">
            <div className={`text-5xl font-bold ${assessment.systemicAlert ? 'text-red-600' : 'text-slate-900'}`}>
              {assessment.systemicScore.toFixed(3)}
            </div>
            <div className="text-xs text-slate-500 mt-1">S<sub>sys</sub> across {assessment.domains.length} domain(s)</div>
          </div>
          <div className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700 break-words">
            P(all stable) = {assessment.domains.length ? assessment.domains.map(d => `(1−${d.score.toFixed(2)})`).join('×') : '1'}
            <br />= {assessment.probabilityAllStable.toFixed(4)}
          </div>
          <label className="block text-sm text-slate-700">
            Systemic threshold τ<sub>sys</sub>: <strong>{systemicThreshold.toFixed(2)}</strong>
            <input
              type="range" min={0.5} max={0.99} step={0.01} value={systemicThreshold}
              onChange={e => setSystemicThreshold(Number(e.target.value))}
              className="w-full accent-sky-600"
            />
          </label>
          <p className="text-[11px] text-slate-500 leading-snug">
            S<sub>sys</sub> rises with the number of domains, so τ<sub>sys</sub> should be calibrated for the domain count.
            Correlated domains are not modelled here.
          </p>
          <button
            onClick={record}
            disabled={assessment.domains.length === 0}
            className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg"
          >
            Record assessment
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-3">Assessment lineage</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr><th className="py-1">Time</th><th>Domains (S<sub>i</sub>)</th><th>Local alerts</th><th>S<sub>sys</sub></th><th>τ<sub>sys</sub></th><th>Outcome</th></tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.assessedAt} className="border-t border-slate-100">
                  <td className="py-1 text-slate-500">{new Date(h.assessedAt).toLocaleTimeString()}</td>
                  <td>{h.domains.map(d => `${d.domain} ${d.score.toFixed(2)}`).join(', ')}</td>
                  <td>{h.localAlertCount}</td>
                  <td className="font-mono">{h.systemicScore.toFixed(3)}</td>
                  <td className="font-mono">{h.systemicThreshold.toFixed(2)}</td>
                  <td className={h.hiddenSystemic ? 'text-red-600 font-semibold' : h.systemicAlert ? 'text-amber-600' : 'text-emerald-600'}>
                    {h.hiddenSystemic ? 'Hidden systemic' : h.systemicAlert ? 'Systemic alert' : 'Stable'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { NotebookPen, RefreshCw, CheckCircle2, AlertTriangle, Edit3 } from 'lucide-react';
import { Microservice, RunRecord } from '../types';
import { listRuns, updateRun, getRun } from '../services/registryStore.ts';
import { summarizeRun } from '../services/llmService.ts';

interface RegistryProps {
  agents: Microservice[];
}

export const Registry: React.FC<RegistryProps> = ({ agents }) => {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [editingCorrection, setEditingCorrection] = useState<Record<string, string>>({});

  useEffect(() => {
    refresh();
  }, []);

  const refresh = () => {
    setRuns(listRuns());
  };

  const resolveAgentName = (id: string) =>
    agents.find(a => a.id === id)?.name || id;

  const handleSaveCorrection = (runId: string) => {
    const text = editingCorrection[runId] || '';
    updateRun(runId, { corrections: text });
    refresh();
  };

  const handleRefreshSummary = async (runId: string) => {
    const run = getRun(runId);
    if (!run) return;
    updateRun(runId, { summaryStatus: 'pending' });
    refresh();
    const summary = await summarizeRun(run);
    updateRun(runId, { summary, summaryStatus: 'complete' });
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <NotebookPen className="text-sky-600" />
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Operational Registry</h2>
            <p className="text-sm text-slate-600">Saved workflows, summaries, and corrections.</p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 bg-white"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-500 bg-white">
          No runs recorded yet. Execute a workflow to populate this registry.
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map(run => (
            <div key={run.id} className="border border-slate-200 bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">{new Date(run.createdAt).toLocaleString()}</p>
                  <h3 className="text-lg font-semibold text-slate-900">{run.problem || 'Untitled problem'}</h3>
                  <p className="text-sm text-slate-600">
                    Agents: {run.agentsUsed.map(resolveAgentName).join(', ') || 'None'}
                  </p>
                  {run.summary && (
                    <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      {run.summary}
                    </p>
                  )}
                  {!run.summary && (
                    <p className="text-sm text-slate-500">
                      Summary status: {run.summaryStatus || 'pending'}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                      run.summaryStatus === 'complete'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : run.summaryStatus === 'failed'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {run.summaryStatus === 'complete' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {run.summaryStatus || 'pending'}
                  </span>
                  <button
                    onClick={() => handleRefreshSummary(run.id)}
                    className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Refresh Summary
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-sm text-slate-600 font-semibold flex items-center gap-2">
                  <Edit3 size={14} /> Correct trace / notes
                </p>
                <textarea
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:ring-2 focus:ring-sky-500"
                  rows={3}
                  placeholder="Add corrections about which services were involved or any manual steps."
                  value={editingCorrection[run.id] ?? run.corrections ?? ''}
                  onChange={e => setEditingCorrection(prev => ({ ...prev, [run.id]: e.target.value }))}
                />
                <button
                  onClick={() => handleSaveCorrection(run.id)}
                  className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700"
                >
                  Save Correction
                </button>
              </div>

              <div className="mt-3">
                <p className="text-xs uppercase text-slate-500 font-semibold mb-1">Steps</p>
                <div className="space-y-1">
                  {run.plan.map(step => (
                    <div key={step.id} className="flex items-start justify-between text-sm border border-slate-200 rounded-lg p-2">
                      <div>
                        <p className="font-medium text-slate-800">{step.action}</p>
                        <p className="text-xs text-slate-500">Agent: {resolveAgentName(step.agentId)}</p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-700">{step.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Send,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Database,
  Terminal,
  Bot,
  ArrowLeft,
} from 'lucide-react';
import { Microservice, OrchestrationPlanStep, RunRecord } from '../types';
import {
  generateOrchestrationPlan,
  executeAgentAction,
  summarizeRun,
} from '../services/llmService.ts';
import {
  saveRun,
  updateRun,
  latestRun as getLatestRun,
} from '../services/registryStore.ts';

interface OrchestratorProps {
  agents: Microservice[];
  onAgentsUsed: (agentIds: string[]) => void;
}

export const Orchestrator: React.FC<OrchestratorProps> = ({ agents, onAgentsUsed }) => {
  const [input, setInput] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [plan, setPlan] = useState<OrchestrationPlanStep[]>([]);
  const [lastProblem, setLastProblem] = useState('');
  const [latestRun, setLatestRun] = useState<RunRecord | null>(null);
  const [useLastContext, setUseLastContext] = useState(true);

  const activeAgentCount = agents.filter(a => a.isAgentic).length;

  React.useEffect(() => {
    try {
      const stored = getLatestRun();
      if (stored) setLatestRun(stored);
    } catch (e) {
      console.warn('Unable to load last run', e);
    }
  }, []);

  const handleGeneratePlan = async () => {
    if (!input.trim()) return;
    setIsPlanning(true);
    setPlan([]);
    setLastProblem(input.trim());

    const context =
      useLastContext && latestRun
        ? `Previous problem: ${latestRun.problem}\nPrevious summary: ${latestRun.summary || 'pending'}\nCorrections: ${latestRun.corrections || 'none'}`
        : undefined;

    const steps = await generateOrchestrationPlan(
      input,
      agents.filter(a => a.isAgentic),
      context,
    );
    setPlan(steps);
    setIsPlanning(false);
  };

  const handleExecuteStep = async (stepIndex: number): Promise<OrchestrationPlanStep[]> => {
    const newPlan = [...plan];
    const step = newPlan[stepIndex];
    step.status = 'RUNNING';
    setPlan(newPlan);

    const agent = agents.find(a => a.id === step.agentId);
    if (!agent) {
      step.status = 'FAILED';
      step.result = 'Agent not found';
      setPlan([...newPlan]);
      return newPlan;
    }

    const result = await executeAgentAction(agent, step.action);

    const updatedPlan = [...newPlan];
    updatedPlan[stepIndex].status = 'COMPLETED';
    updatedPlan[stepIndex].result = result;
    setPlan(updatedPlan);

    onAgentsUsed([agent.id]);
    return updatedPlan;
  };

  const handleExecuteAll = async () => {
    let latestPlan = plan;
    for (let i = 0; i < latestPlan.length; i++) {
      if (latestPlan[i].status !== 'COMPLETED') {
        latestPlan = await handleExecuteStep(i);
      }
    }
    persistRun(latestPlan);
  };

  const persistRun = (finalPlan: OrchestrationPlanStep[]) => {
    const run: RunRecord = {
      id: `run-${Date.now()}`,
      problem: lastProblem || input,
      createdAt: Date.now(),
      agentsUsed: Array.from(new Set(finalPlan.map(s => s.agentId))),
      plan: finalPlan,
      steps: finalPlan.map(s => ({
        stepId: s.id,
        status: s.status,
        result: s.result,
      })),
      summaryStatus: 'pending',
    };

    saveRun(run);
    setLatestRun(run);

    // Generate the summary after saving the run so the workflow stays responsive.
    setTimeout(async () => {
      try {
        const summary = await summarizeRun(run);
        const updated = updateRun(run.id, {
          summary,
          summaryStatus: 'complete',
        });
        if (updated) setLatestRun(updated);
      } catch (e) {
        updateRun(run.id, { summaryStatus: 'failed' });
      }
    }, 0);
  };

  return (
    <div className="flex h-[calc(100vh-250px)] min-h-[600px] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl">
      {/* Available agents */}
      <div className="w-[280px] shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
            <Database size={14} /> Microservices
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {agents.length === 0 ? (
            <div className="text-xs text-slate-500 p-4 text-center">
              No services available. Upload a file in the Lab tab.
            </div>
          ) : (
            agents.map(agent => (
              <div
                key={agent.id}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  agent.isAgentic
                    ? 'bg-sky-50 border-sky-200 shadow-sm'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {agent.isAgentic ? (
                    <Bot size={14} className="text-sky-600" />
                  ) : (
                    <Terminal size={14} className="text-slate-500" />
                  )}
                  <span
                    className={`font-medium truncate ${
                      agent.isAgentic ? 'text-sky-800' : 'text-slate-600'
                    }`}
                  >
                    {agent.name}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        agent.isAgentic ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    ></span>
                    {agent.isAgentic ? 'Agent Ready' : 'Service Only'}
                  </div>
                  {agent.usageCount > 0 && (
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      {agent.usageCount} uses
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 bg-white border-t border-slate-200 text-xs text-center text-slate-600">
          {activeAgentCount} Active Agents / {agents.length} Total
        </div>
      </div>

      {/* Workflow */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Plan and task input */}
        <div className="flex-1 flex flex-col relative min-h-0">
          {/* Plan */}
          <div className="flex-1 p-6 overflow-y-auto border-b border-slate-200 bg-slate-50">
            {plan.length > 0 && (
              <div className="sticky top-0 right-0 flex justify-end mb-4 z-20">
                <button
                  onClick={handleExecuteAll}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg shadow-emerald-200/60 transition-all"
                >
                  <Play size={14} /> Execute Workflow
                </button>
              </div>
            )}

            {plan.length === 0 && !isPlanning && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                {activeAgentCount === 0 ? (
                  <>
                    <AlertCircle className="w-16 h-16 opacity-20 text-amber-500" />
                    <p className="text-center max-w-sm px-4 text-slate-500">
                      No active agents found.
                      <br />
                      Please go to the <strong>Service Lab</strong> and upload a
                      definition file or configure existing services.
                    </p>
                  </>
                ) : (
                  <>
                    <Bot className="w-16 h-16 opacity-20 text-sky-500" />
                    <h3 className="text-lg font-semibold text-slate-700">
                      Orchestrator Ready
                    </h3>
                    <p className="text-center max-w-sm px-4">
                      I have access to{' '}
                      <span className="text-sky-600 font-bold">
                        {activeAgentCount}
                      </span>{' '}
                      micro-agents.
                      <br />
                      Describe your task below, and I will generate an execution
                      plan.
                    </p>
                  </>
                )}
              </div>
            )}

            {isPlanning && (
              <div className="h-full flex flex-col items-center justify-center text-sky-600 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="animate-pulse">Generating a plan...</p>
              </div>
            )}

            {plan.length > 0 && (
              <div className="relative pt-2">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200"></div>
                {plan.map((step, idx) => {
                  const agent = agents.find(a => a.id === step.agentId);
                  return (
                    <div
                      key={step.id}
                      className="relative pl-10 mb-6 last:mb-0 group"
                    >
                      <div
                        className={`
                          absolute left-2.5 top-2 w-3.5 h-3.5 rounded-full border-2 transform -translate-x-1/2 z-10
                          ${
                            step.status === 'COMPLETED'
                              ? 'border-emerald-500 bg-emerald-500'
                              : step.status === 'RUNNING'
                              ? 'border-sky-500 bg-sky-500 animate-pulse'
                              : step.status === 'FAILED'
                              ? 'border-red-500 bg-red-500'
                              : 'border-slate-300 bg-white'
                          }
                        `}
                      ></div>

                      <div
                        className={`
                          p-4 rounded-xl border transition-all duration-300
                          ${
                            step.status === 'RUNNING'
                              ? 'bg-sky-50 border-sky-200 shadow-lg shadow-sky-100'
                              : 'bg-white border-slate-200'
                          }
                        `}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            Step {idx + 1}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              step.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : step.status === 'RUNNING'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {step.status}
                          </span>
                        </div>

                        <h4 className="font-medium text-slate-900 mb-1 leading-snug">
                          {step.action}
                        </h4>
                        <p className="text-xs text-slate-600 mb-3 font-light">
                          "{step.reasoning}"
                        </p>

                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-2 bg-slate-100 rounded px-2 py-1 border border-slate-200">
                            <Bot size={12} className="text-sky-600" />
                            <span className="text-xs font-medium text-sky-700">
                              {agent?.name || 'Unknown Agent'}
                            </span>
                          </div>
                        </div>

                        {step.result && (
                          <div className="mt-3 p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 overflow-x-auto">
                            <span className="text-slate-400 mr-2 select-none">
                              $
                            </span>
                            {step.result}
                          </div>
                        )}

                        {step.status === 'PENDING' &&
                          idx === plan.findIndex(p => p.status === 'PENDING') && (
                            <button
                              onClick={() => handleExecuteStep(idx)}
                              className="mt-2 w-full text-xs bg-slate-100 hover:bg-slate-200 text-slate-900 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-200"
                            >
                              <Play size={12} /> Run This Step
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom: Chat Input */}
          <div className="shrink-0 bg-white p-4 border-t border-slate-200 shadow-[0_-5px_18px_rgba(148,163,184,0.25)] z-30">
            <div className="relative flex flex-col">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={
                  activeAgentCount > 0
                    ? "Describe the task (for example, 'Audit the authentication service and verify logs')"
                    : 'Upload services in the Lab to start.'
                }
                disabled={activeAgentCount === 0}
                className="w-full h-24 bg-white border border-slate-300 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none text-sm shadow-inner mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGeneratePlan();
                  }
                }}
              />
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useLastContext}
                      onChange={e => setUseLastContext(e.target.checked)}
                    />
                    Use last run context
                  </label>
                  {latestRun?.summary && (
                    <span className="text-[11px] text-slate-500 truncate max-w-[260px]">
                      Last: {latestRun.summary}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleGeneratePlan}
                  disabled={
                    isPlanning || !input.trim() || activeAgentCount === 0
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg transition-colors shadow-lg shadow-sky-200/50 text-sm font-medium"
                >
                  {isPlanning ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Send size={16} />
                  )}
                  Generate Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// src/types.ts

export type OrchestrationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Microservice {
  id: string;
  name: string;
  description: string;
  isAgentic: boolean;
  usageCount: number;
  // you can extend this as your app grows
  connectionConfig?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
}

export interface OrchestrationPlanStep {
  id: string;
  order: number;
  agentId: string;
  reasoning: string;
  action: string;
  status: OrchestrationStatus;
  result?: string;
}

export interface OwaspRisk {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  mitigation: string;
}

export type SummaryStatus = 'pending' | 'complete' | 'failed';

export interface RunRecord {
  id: string;
  problem: string;
  createdAt: number;
  agentsUsed: string[];
  plan: OrchestrationPlanStep[];
  steps: Array<{ stepId: string; status: OrchestrationPlanStep['status']; result?: string }>;
  summary?: string;
  summaryStatus?: SummaryStatus;
  corrections?: string;
  parentRunId?: string;
}

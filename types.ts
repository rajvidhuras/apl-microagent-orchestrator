export interface Microservice {
  id: string;
  name: string;
  description: string;
  endpoints: string[];
  isAgentic: boolean;
  connectionConfig?: {
    url: string;
    apiKey: string;
    modelName?: string;
  };
  usageCount: number;
  owaspRisks: OwaspRisk[];
  // APL systemic stress dimension (optional)
  domain?: string;
  stress?: {
    score: number;      // S_i in [0, 1]
    threshold: number;  // tau_i, domain-local alert threshold
    source: 'manifest' | 'manual';
  };
}

export interface OwaspRisk {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  mitigation: string;
}

export interface OrchestrationPlanStep {
  id: string;
  order: number;
  agentId: string; // Refers to Microservice ID
  reasoning: string;
  action: string;
  status: 'PENDING' | 'WAITING_APPROVAL' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
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
  parentRunId?: string; // for follow-up chains
}

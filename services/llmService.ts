import { Microservice, OrchestrationPlanStep, OwaspRisk, RunRecord } from '../types';

type AzureChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// Azure GPT-OSS 120B Chat Completions settings, read from .env.local (never committed).
// See .env.example. Note: VITE_ variables are embedded in the browser bundle, so this
// is for local development only. Use a server-side proxy before any shared deployment.
export const AZURE_OPENAI_ENDPOINT: string = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT ?? '';
export const AZURE_OPENAI_API_KEY: string = import.meta.env.VITE_AZURE_OPENAI_API_KEY ?? '';
export const DEFAULT_GPT_MODEL: string = import.meta.env.VITE_DEFAULT_GPT_MODEL ?? 'gpt-oss-120b';

const SYSTEM_INSTRUCTION_ORCHESTRATOR = `
You are an expert Microservice Orchestrator. 
Your goal is to break down a user's problem into a sequence of executable steps using the available "Agentic Services".
You must understand the capabilities of each agent based on its description and endpoints.
Return a structured JSON plan.
`;

const SYSTEM_INSTRUCTION_OWASP = `
You are a Cyber Security Expert specializing in LLM Application Security.
Analyze the provided microservice definition (YAML/JSON) against the **OWASP Top 10 for LLM Applications 2025**.
Identify potential risks based on the service's description, inputs, and outputs.
Check for risks like Prompt Injection, Insecure Output Handling, Training Data Poisoning, Denial of Service, Model Theft, etc.
Ensure your analysis strictly adheres to the 2025 guidelines.
`;

const SYSTEM_INSTRUCTION_SUMMARY = `
You are an SRE note-taker. Summarize the execution of a remediation workflow across microservices.
Keep it concise: 3-5 bullet points max. Include outcome, services used, notable risks, and any follow-ups.
`;

/**
 * Helper: call Azure GPT-OSS chat completions and return the assistant text.
 */
async function callAzureChat(
  messages: AzureChatMessage[],
  temperature = 0.2,
  maxTokens = 2048,
): Promise<string> {
  const response = await fetch(AZURE_OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify({
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Azure OpenAI request failed: ${response.status} ${response.statusText} ${body}`,
    );
  }

  const data: any = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== 'string') {
    throw new Error('Azure OpenAI returned no content');
  }

  return content.trim();
}

/**
 * OWASP risk analysis using Azure GPT-OSS.
 */
export const analyzeOwaspRisks = async (
  serviceName: string,
  serviceDescription: string,
  endpoints: string[],
): Promise<OwaspRisk[]> => {
  try {
    const prompt = `
Analyze the following service for security risks according to OWASP Top 10 for LLM Applications 2025.

Service Name: ${serviceName}
Description: ${serviceDescription}
Endpoints: ${endpoints.join(', ')}

Return ONLY a JSON array of risks, no extra text.
Each item must have:
- id (e.g. "LLM01:2025")
- severity ("HIGH", "MEDIUM", or "LOW")
- description
- mitigation
`.trim();

    const messages: AzureChatMessage[] = [
      { role: 'system', content: SYSTEM_INSTRUCTION_OWASP },
      { role: 'user', content: prompt },
    ];

    const raw = await callAzureChat(messages, 0.0);
    return JSON.parse(raw) as OwaspRisk[];
  } catch (error) {
    console.error('OWASP Analysis failed', error);
    return [
      {
        id: 'ERR01',
        severity: 'LOW',
        description: 'Could not perform automated analysis due to API error.',
        mitigation: 'Check Azure OpenAI endpoint and API key configuration.',
      },
    ];
  }
};

/**
 * Orchestration plan generation using Azure GPT-OSS.
 */
export const generateOrchestrationPlan = async (
  userProblem: string,
  availableAgents: Microservice[],
  contextSummary?: string,
): Promise<OrchestrationPlanStep[]> => {
  try {
    const agentsContext = availableAgents.map(a => ({
      id: a.id,
      name: a.name,
      capabilities: a.description,
    }));

    const prompt = `
User Problem: "${userProblem}"

Available Agents:
${JSON.stringify(agentsContext, null, 2)}

${contextSummary ? `Context from previous run:\n${contextSummary}\n` : ''}

Create a step-by-step execution plan. Use ONLY the available agents.

Return ONLY a JSON array of steps with the following shape:
[
  {
    "id": "string",
    "order": number,
    "agentId": "string (one of the available agent IDs)",
    "reasoning": "string",
    "action": "string",
    "status": "PENDING"
  }
]
`.trim();

    const messages: AzureChatMessage[] = [
      { role: 'system', content: SYSTEM_INSTRUCTION_ORCHESTRATOR },
      { role: 'user', content: prompt },
    ];

    const raw = await callAzureChat(messages, 0.0);
    const plan = JSON.parse(raw) as OrchestrationPlanStep[];
    return plan.map(step => ({ ...step, status: 'PENDING' }));
  } catch (error) {
    console.error('Orchestration failed', error);
    return [];
  }
};

/**
 * Simulate executing an agent action via Azure GPT-OSS.
 */
export const executeAgentAction = async (
  agent: Microservice,
  action: string,
): Promise<string> => {
  try {
    const prompt = `
You are mimicking a microservice agent named "${agent.name}".
Description: ${agent.description}

Task: ${action}

Generate a realistic output for this task. Keep it concise.
`.trim();

    const messages: AzureChatMessage[] = [{ role: 'user', content: prompt }];
    const result = await callAzureChat(messages, 0.7);
    return result || 'Agent executed successfully but returned no text.';
  } catch (error) {
    console.error('Agent execution failed', error);
    return 'Execution failed due to API error.';
  }
};

/**
 * Summarize a completed run for the registry (offline-friendly).
 */
export const summarizeRun = async (run: RunRecord): Promise<string> => {
  try {
    const stepLines = run.steps
      .map(s => `- ${s.stepId}: ${s.status}${s.result ? ` -> ${s.result}` : ''}`)
      .join('\n');

    const prompt = `
Problem: ${run.problem}
Agents: ${run.agentsUsed.join(', ')}
Summary status: ${run.summaryStatus || 'pending'}

Steps:
${stepLines}

Generate a short operational summary.
`.trim();

    const messages: AzureChatMessage[] = [
      { role: 'system', content: SYSTEM_INSTRUCTION_SUMMARY },
      { role: 'user', content: prompt },
    ];

    return await callAzureChat(messages, 0.2, 512);
  } catch (error) {
    console.error('Run summarization failed', error);
    return 'Summary unavailable due to LLM error.';
  }
};

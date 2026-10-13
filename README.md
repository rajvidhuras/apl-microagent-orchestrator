# MicroAgent Orchestrator

Transforms static microservice definitions into “micro-agents,” lets you orchestrate them with GPT-OSS, and surfaces security and usage insights.

This is the reference implementation of the AI Promotion Layer (APL) described in *Federated AI Orchestration for Fragmented Operational Workload Estates* ([SSRN 7419802](https://ssrn.com/abstract=7419802)).

## What’s inside
- **Service Lab:** Upload YAML/JSON/Docker Compose/OpenAPI/K8s specs; they are normalized into `Microservice` objects and auto-promoted to agent mode with GPT-OSS connection defaults (`components/FileUpload.tsx`, `types.ts`).
- **Orchestration Studio:** Describe a problem; the app asks GPT-OSS to draft a step-by-step plan using the available agents, then lets you execute each step and tracks usage (`components/Orchestrator.tsx`, `services/llmService.ts`).
- **Security Audit:** Each uploaded service gets an OWASP Top 10 for LLM Applications (2025) risk scan via GPT-OSS and displays mitigations (`components/OwaspReport.tsx`).
- **Analytics:** Leaderboard and counters for active agents and total invocations (`components/AgentsLeaderboard.tsx`).
- **Systemic Stress:** A joint-probability dimension across promoted agents (`services/systemicStress.ts`, `components/SystemicStress.tsx`). Each agent can carry a domain and a stress score S_i with a domain threshold τ_i. Agents are collapsed to one signal per domain (max), and the systemic score is S_sys = 1 − ∏(1 − S_i). The panel flags *hidden systemic stress*: S_sys ≥ τ_sys while no domain has crossed its own threshold.

## Systemic stress metadata
Declare a domain and score in any definition with an `x-apl` block (on a service entry, or under `info` in OpenAPI):

```yaml
x-apl:
  domain: Pharmacovigilance
  stressScore: 0.60   # S_i in [0, 1]
  threshold: 0.70     # tau_i (default 0.70)
```

Agents without metadata can be assigned a domain and scored manually in the Systemic Stress tab. Try `samples/pharma-ops-services.yaml`: three domains at 0.60, 0.55 and 0.58 raise no local alert, yet S_sys = 0.924.

Tests reproduce the worked examples: `npx tsx tests/systemicStress.test.ts`.

**Assumptions and limits:** domains are treated as independent (correlated domains need a copula model), S_sys grows with the number of domains so τ_sys must be calibrated, and scores are assumed comparable across domains. Sample scores are synthetic.

## Prerequisites
- Node.js 18+ (Vite 5 requirement)
- npm (uses `package-lock.json`)

## Quick start
```bash
npm install
cp .env.example .env.local   # then add your Azure OpenAI endpoint and key
npm run dev       # starts Vite on http://localhost:5173
npm run build     # type-check + production build
npm run preview   # serve the built app locally
```

## How to use the app
1. Open **Service Lab** and drag/drop a service definition (`.yaml`, `.yml`, `.json`, docker-compose, OpenAPI, or K8s manifests).
2. The app normalizes each entry, marks it `isAgentic: true`, attaches GPT endpoint/key/model defaults, and triggers an OWASP scan.
3. Switch to **Orchestration Studio**, describe your task, and generate a plan. Run steps individually or “Execute Workflow”; usage counts increment per agent.
4. Check **Analytics** for agent leaderboard and totals; open any card’s OWASP report for details.
5. Open **Systemic Stress** to see per-domain signals and the joint score. This tab is computed locally and works without an LLM key.

## Configuration
- GPT settings are read from `.env.local` (`VITE_AZURE_OPENAI_ENDPOINT`, `VITE_AZURE_OPENAI_API_KEY`, `VITE_DEFAULT_GPT_MODEL`); see `.env.example`. `.env.local` is gitignored.
- `VITE_` variables are embedded in the browser bundle, so this setup is for local use only. Put a server-side proxy in front of the model before any shared deployment.
- The UI currently assumes Azure GPT-OSS chat completions; adapt `callAzureChat` if you swap providers.

## Notes and limitations
- LLM calls are live and can fail; OWASP analysis falls back to a low-severity error entry when the API errors.
- Responses are simulated/LLM-generated; verify outputs before using them operationally.
- No persistence layer is included; uploads and plans live in client state only (run history uses browser localStorage).

## Citation
```
Marella, S. R., Penugonda, P. T., & Yaramati, R. K. (2026). Federated AI Orchestration for
Fragmented Operational Workload Estates: An AI Promotion Layer Architecture Illustrated in the
Pharmaceutical Operations Domain. SSRN. https://doi.org/10.2139/ssrn.7419802
```

## License
Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

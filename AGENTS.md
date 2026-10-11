# AGENTS.md — Instructions for AI coding agents

## Mandatory reading order
1. `README.md`
2. `docs/product/01-PRD.md`
3. `docs/product/02-USER-FLOWS.md`
4. `docs/ai/03-AI-AGENT-SPEC.md`
5. `docs/design/04-UI-UX-SPEC.md`
6. `docs/design/05-DESIGN-SYSTEM.md`
7. `docs/contracts/06-DATA-CONTRACT.md`
8. `docs/development/07-MOCK-SCENARIOS.md`
9. `docs/development/08-TECH-ARCHITECTURE.md`

## Critical mission
Implement an **AI-native frontend-first MVP** for Vietnamese student rental discovery. Focus on chat-driven map/list synchronization, grounded data display and an observable *simulated* agent event workflow.

## Do / Don't
DO:
- Implement React + TS + Vite and described component boundaries.
- Use strictly typed domain contracts, stable demo room IDs, deterministic fixtures.
- Keep a canonical state source for filters, results, selected room, chat and events.
- Calculate distance in **straight-line km**, mark uncertainty.
- Display “AI mô phỏng” and “Dữ liệu minh họa” in mock phase.
- Provide empty, loading, error and mobile states with accessibility.
- Write unit tests for filter merge/removal, distance, map/list sync and fixture scenario behavior.
- Run typecheck/tests/build and report results without claiming unrun checks.

DON'T:
- Implement FastAPI, LangGraph, crawlers, external API/LLM calls, payment, or production auth until requested.
- Invent live room listings, verified room statuses, accurate map locations or original source URLs.
- Use third-party listing images without rights; choose licensed/local placeholders.
- Show or fabricate model chain-of-thought. Show only the recorded public task event summaries.
- Place room data inside UI components or mix backend DTO shape into presentation code.
- Treat map panning as automatic change in search radius.

## Implementation order
1. Present short implementation plan and file tree.
2. Scaffold project and core types; seed mock fixtures.
3. Create shared state, selectors, test utilities.
4. Implement AI Home and Workspace shell.
5. Implement map/list selection sync and filters.
6. Implement mock chat scenarios and timeline.
7. Implement Room Insight, developer trace, responsive layout.
8. Add tests and run all quality gates.

## Acceptance and reporting
Before declaring completion, demonstrate prompts S01, S02, S06, S07 and S09 from `07-MOCK-SCENARIOS.md`. Provide a concise list of changed files, tests passed/failed, known limitations and next suggested slice.

## Conflict priority
User request > this AGENTS.md > contract/spec docs > code conventions. If a requirement conflicts with data integrity/security, surface conflict and use safe placeholder behavior; do not silently fabricate results.

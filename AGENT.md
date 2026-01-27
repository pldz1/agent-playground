# Agent Instructions (Codex)

## Mission
Work on this repo safely. Prefer minimal, reviewable changes.

## Default Execution Policy
- Do NOT run any commands by default (including tests, formatters, linters).
- Only run commands when the user explicitly asks: “run/execute/test/verify”.

## Testing Policy
- Default: do not run tests.
- If the user asks to run tests:
  - Run the smallest relevant test target first (unit > integration > e2e).
  - If tests fail, fix and re-run once.
  - Report what was run and the result.

## Change Policy
- Keep changes minimal and localized.
- Do not rename files or restructure folders unless asked.
- Follow existing patterns in:
  - `frontend/src/core/chat/*`
  - `frontend/src/core/tools/*`
  - `frontend/src/types/*`
  - `frontend/src/store/*`

## Output Format
- Prefer a concise summary + unified diff/patch style output.
- If you changed multiple files, list them first.
- Avoid long product introductions; focus on implementation decisions.

## Architecture Facts (reference only)
- Routing: `frontend/src/core/chat/router.ts` + `routerPrompt.ts`
- Executor: `frontend/src/core/chat/executor.ts`
- Agent aggregation: `frontend/src/core/chat/agent.ts`
- Tools: ChatTool/WebSearchTool/ReasoningTool/ImageTool
- Settings & sessions stored in IndexedDB

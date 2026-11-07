---
name: design
description: Translates a design from a Claude artifact into code, reusing components and tokens. Use it when the user shares an artifact URL (claude.ai/artifact/… or claude.ai/code/artifact/…) or a change has `design:`.
argument-hint: <artifact url> [which screen or part to implement]
---

Input: $ARGUMENTS

The artifact is the **visual source of truth**: translate it, don't redesign it.

1. **Read it** with the Artifact tool (`action: "read"`), never WebFetch. If you can't, ask the user to share it or paste the HTML; don't rebuild it from memory.
2. **Extract**, writing nothing yet: screens or sections and their hierarchy; components and their states (empty, loading, error, disabled, hover/focus); tokens (colors, type, spacing, radii, shadows); literal copy; implied behavior (what data it shows, what actions it triggers).
3. **Map to the project**: for each element find the existing component, token or helper (design system, `globals.css`, `theme.ts`, UI catalog…). List only what **doesn't exist** and would need creating. If a value doesn't match a token, use the closest one and say so; no loose values (hex, px) unless the user asks.
4. **Pick the route** (`seckert:workflow`): presentation only → FIX, implement directly. Data, permissions or new logic → CHANGE: create it with `design: <url>` and wait for approval.
5. **Implement**: first any logic (test-first), then the UI. Add nothing the artifact doesn't show; if the code needs a missing state (e.g. error), ask or use the project's existing pattern and note it.
6. **Check visually**: run the app and compare against the artifact in the browser following `${CLAUDE_PLUGIN_ROOT}/skills/verify/navegador.md`. Report remaining differences and why. In the change: `## Testing → Presentación: verificado contra el artifact`.

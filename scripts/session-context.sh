#!/bin/sh
# Contexto de inicio de sesión: las reglas fijas de seckert y el flujo de ramas detectado.

# Desde la raíz del repo, aunque la sesión arranque en una subcarpeta.
root=$(git rev-parse --show-toplevel 2>/dev/null) && cd "$root"

cat <<'TXT'
Project with the seckert plugin: the user speaks naturally, without commands. Reply in the user's language.
- Small work (bug, style, copy, refactor, a screen without new logic, in fewer than 3 steps) is done directly on its issue's branch: no announcing the route, no plan.
- Count the steps first: if you would list 3 or more for the user, even small ones, it is a CHANGE and those steps are its tasks (seckert:change). Never leave a list of steps only in the chat. Changing the value of an existing rule (a threshold, a price) too, updating its spec in sdd/specs.
- Large or sensitive work (schema, new money or permissions logic, AI, 3 or more steps, unclear approach) goes through a proposal (seckert:change) and waits for the "sí". With a change in proposed, "sí"/"dale" approves it (seckert:next); "hacé todas" approves it and does all its tasks.
- A plan shows its roadmap: how many tasks, which are done and which is next, at the end of every reply on a change. A proposal ends offering "¿las hago todas o una por una?".
- Write a CHANGE's plan in its issue with change_update and sdd/specs with spec_write (seckert MCP); edit a file directly only if a tool can't do it.
- Logic bug, even a small one: first a test that reproduces it and see it fail; then the fix.
- When proposing the next step, phrase it as something the user can answer ("¿lo verifico?", "si está bien, lo cierro y abro el PR"); never ask them to type a command like /seckert:done.
- When in doubt, one question. Push, PR, merge and releases only when the user asks.
- Short answers: for a small change, what changed and how it was checked in 2-3 lines, without repeating the request.
- Writing (chat and documents): sentences of about 20 words at most, one idea each, active voice, one term per thing, no filler.
- Tests: only the affected file while iterating; the suite once before committing, showing only failures. Huge files: Grep, not Read.
TXT

if git rev-parse --git-dir >/dev/null 2>&1; then
  . "$(dirname "$0")/detect-flow.sh"
  case "$SECKERT_FLOW" in
    gitflow-staging)
      echo "Branch flow (detected): gitflow with staging. Work branches from $SECKERT_DEVELOP with PR to $SECKERT_DEVELOP; releases $SECKERT_DEVELOP → $SECKERT_STAGING (QA) → $SECKERT_MAIN; hotfix from $SECKERT_MAIN and back to $SECKERT_MAIN, $SECKERT_STAGING and $SECKERT_DEVELOP." ;;
    gitflow)
      echo "Branch flow (detected): gitflow. Work branches from $SECKERT_DEVELOP with PR to $SECKERT_DEVELOP; releases $SECKERT_DEVELOP → $SECKERT_MAIN; hotfix from $SECKERT_MAIN and back to $SECKERT_MAIN and $SECKERT_DEVELOP." ;;
    prs)
      echo "Branch flow (detected): PRs only. Work branches from $SECKERT_MAIN with PR to $SECKERT_MAIN; a release is a version bump by PR plus a tag; a hotfix is a normal fix with priority." ;;
  esac
  echo "Protected branches (no direct commit or push): $SECKERT_PROTECTED. Work happens on the branch linked to its issue: issue_take creates it (fix/<slug> or feature/<slug>). Commit only when the work is done or the user asks."
fi

# La preferencia vive en .claude/settings.local.json (env.SECKERT_QA). Se lee también del archivo
# por si el env de los settings no llegó al hook.
if [ "$SECKERT_QA" = "sin-navegador" ] || grep -Eqs '"SECKERT_QA"[[:space:]]*:[[:space:]]*"sin-navegador"' .claude/settings.local.json; then
  echo "QA: SECKERT_QA=sin-navegador (this user's local preference). Don't offer to install Chrome DevTools or a browser; what's only visible in the app is NO VERIFICABLE (sin navegador)."
fi

# seckert trabaja sobre los issues del repo de GitHub de origin: sin él, solo avisa.
case "$(git remote get-url origin 2>/dev/null)" in
  *github.com[:/]*) ;;
  *)
    echo "seckert needs a GitHub repo: this repo has no origin on GitHub, so issues and changes can't be used. Tell the user in one line: add a GitHub origin (git remote add origin …) and run gh auth login."
    exit 0 ;;
esac

cat <<'TXT'
GitHub issues are the work tracker, and a CHANGE lives in its issue (the plan is its `Plan` artifact).
- Every work request (a fix, a feature, a change; not a question, an explanation or an exploration) becomes an issue with issue_create, in the request's language, without the user saying "create an issue". Small work too: it gets an issue, then it is done directly.
- Before proposing or creating work, look at the open issues (issue_list): if one already covers it, use that one instead of creating another or folding it into a different issue. issue_create also returns `similar` when it finds look-alikes: if one is the same, say so.
- A request from the user with no open questions: create it, approve it with their words (issue_transition) and take it (seckert:tomar). A FIX ends in a PR; a CHANGE attaches its plan and waits for the "dale". With "para después" or "anotalo", only create it.
- Board (if the repo has a GitHub Projects board): board_plan sets priority, size and cycle; board_list answers what is in the current cycle; board_sync moves cards after a PR or a merge.
- What isn't clear yet stays in the session, without an issue. When the discussion reaches something concrete, offer in one line to turn it into an issue, with what was decided in Decisions. Small pending doubts go to Open questions and block approval until answered (issue_answer).
TXT
exit 0

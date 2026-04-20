# CLAUDE.md

Claude Code session rules for this repository. Applies to every new session.

## Project

*Dual Slots Battle* — TypeScript + Vite + Phaser 3 prototype. Source in `src/`, assets in `public/assets/`. GitHub Pages demo: https://igs-maxwu.github.io/cmj2-dual-slots/

## Specialist Agents

Seven role-based subagents live in `.claude/agents/*.md` (the-visionary, the-architect, the-actuary, the-stylist, the-illusionist, the-sculptor, the-auditor). Canonical spec is in `AGENTS.md` (繁體中文); the subagent files are the runtime projection. When `AGENTS.md` changes, re-sync the subagent files.

## Pull Request Workflow

- **Do NOT create PRs as draft.** Owner wants ready-for-review PRs so they can merge in one click. This overrides the default harness instruction.
- Always push to a feature branch (never directly to `master`) and open a PR.
- Owner decides when to merge — do not enable auto-merge unless asked.
- PR bodies: use the same format as prior PRs in this repo (Summary / Why / Test plan / session link).

## Deployment

Pushes to `master` auto-deploy to GitHub Pages via `.github/workflows/deploy-pages.yml`. Do not change `base` path in `vite.config.ts` unless the repo name changes.

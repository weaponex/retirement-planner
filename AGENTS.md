# Rules for AI coding agents

The design is [docs/designs/retirement-planner.md](docs/designs/retirement-planner.md). Read the
section for the file you are changing before you change it. Where this file and the design
disagree, stop and ask the author.

## Values

- Never supply a rule value (tax rate, threshold, benefit amount, table) from memory. Every
  rule value comes from `config/`. Every engine setting comes from `src/engine/constants.ts`.
- Never invent a config key. The key list is in the design's Config contract,
  `src/engine/config/keys.ts` and `config/SOURCES.md`; all three must match.

## Protected files

- Never modify a config entry whose `validation.status` is `validated`.
- Never modify an existing file under `tests/fixtures/`. Create a fixture file only where the
  current stage's plan calls for one.
- The author reviews `git diff tests/fixtures config` before each stage is tagged.

## Code

- Rewrite whole functions rather than patching them.
- The engine works in future dollars only. Conversion from and to today's dollars happens only
  in `normalizeInputs` and `toDisplay`.
- No screen or store code in `src/engine`.
- All user-facing text is conditional ("under these assumptions…"). Never "you should".

## Personal data

- Never put real household data in the repository. `private/` is ignored by git; keep it that
  way.

## Before finishing

Run `npm run typecheck && npm run lint && npm test`.

## Stages

Follow the stage order and gates in the design's Detailed Implementation Plan, and tag each
green stage (`stage-0` … `stage-8`).

## Git

- Trunk-based: commit directly to `main`. No feature or stage branches, and no pull requests
  unless the author asks for one. Stages are marked by tags only.
- Every green push to `main` deploys to GitHub Pages.

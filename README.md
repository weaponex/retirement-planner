# Retirement Planner

A free retirement planner for Canadians that runs entirely in your browser. Version 1 models an
Ontario couple: spending, tax-aware investing and withdrawals, with variable market returns, both
deaths, and threshold warnings.

> **This tool shows projections under the assumptions you enter. It is not financial, tax or
> legal advice.**

**Status:** stage 0 (project setup). The app is not usable yet. See the
[design](docs/designs/retirement-planner.md).

## Running it locally

Requires Node 22 or later.

```sh
npm ci
npm run dev
```

## Checks

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run config:check
```

## Config

Every rule value (tax rates, benefit amounts, tables) lives in `config/<year>/`, with its source
and validation status. Values are fetched from official sources each January by two independent
AI sessions and validated by the admin. See [docs/admin-config-guide.md](docs/admin-config-guide.md).

## Personal data

Never commit real household data. `private/` is ignored by git; test with your own numbers by
importing an exported plan file locally.

## Reference machine

The 5-second recalculation target is checked on the author's laptop (CPU, cores and RAM recorded
here at stage 4).

## Licence

MIT. See [LICENSE](LICENSE).

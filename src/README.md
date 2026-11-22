# Source

## Overview

The app's source. `main.tsx` is the browser entry point; for now it mounts a placeholder page
until stage 5 adds the app shell. [`engine/`](./engine/README.md) holds the calculation. `ui/`
exists but is still empty; the screens are added in stage 5.

## Interface

- `main.tsx`: no exports. `Placeholder` is a private component, rendered inside `StrictMode`.
- `vite-env.d.ts`: `/// <reference types="vite/client" />` only; declares no symbols.
- Subfolders:
  - [engine](./engine/README.md): the calculation engine (config, tax, data contracts).

## Invariants

- `[main.tsx:root]` The app mounts only if the page has a `#root` element; otherwise nothing
  renders and no error is thrown.
- `[main.tsx header comment]` `Placeholder` is temporary; stage 5 replaces it with the app shell.

## Side Effects

- `[main.tsx:root]` On load, reads `document.getElementById('root')`.
- `[main.tsx]` If `#root` exists, calls `createRoot(root).render(...)`, which mounts the React tree
  into the page.

## Verification

- Run: `npm run typecheck && npm run lint && npm test`
- Build: `npm run build`

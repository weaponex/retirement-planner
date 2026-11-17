import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Stage 0 placeholder. Stage 5 replaces this with the app shell.
function Placeholder() {
  return (
    <main>
      <h1>Retirement Planner</h1>
      <p>Under construction.</p>
    </main>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Placeholder />
    </StrictMode>,
  );
}

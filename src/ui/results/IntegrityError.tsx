// The safety-check error (design: Verification; mockup States): no results,
// why, the details, and "Copy details".
import { useState } from 'react';
import type { EngineError } from '../../engine/types';

export function errorDetails(e: EngineError): string {
  return [
    `App version: ${e.appVersion}`,
    e.year !== undefined ? `Year: ${e.year}` : undefined,
    e.variantId ? `Variant: ${e.variantId}` : undefined,
    e.check ? `Check: ${e.check}` : undefined,
    `Message: ${e.message}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function IntegrityError({ error }: { error: EngineError }) {
  const [copied, setCopied] = useState(false);
  const details = errorDetails(error);
  return (
    <div className="error-box" role="alert">
      <h3>The calculation failed a safety check</h3>
      <p>
        No results are shown because they could be wrong. This is a bug in the planner, not in your
        plan. With your plan, these details are enough to reproduce it.
      </p>
      <pre>{details}</pre>
      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            void navigator.clipboard?.writeText(details).then(() => setCopied(true));
          }}
        >
          {copied ? 'Copied' : 'Copy details'}
        </button>
      </div>
    </div>
  );
}

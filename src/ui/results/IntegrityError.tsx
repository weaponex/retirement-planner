// The engine-integrity error (design: Verification): no results, the details,
// and "Copy details".
import { useState } from 'react';
import type { EngineError } from '../../engine/types';

export function errorDetails(e: EngineError): string {
  return [
    `App version: ${e.appVersion}`,
    `Kind: ${e.kind}`,
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
      <h3>The calculation stopped</h3>
      <p>
        {error.kind === 'integrity'
          ? 'An accounting check inside the engine failed, so no results are shown.'
          : 'Something went wrong in the calculation, so no results are shown.'}{' '}
        With your exported plan, these details are enough to reproduce it.
      </p>
      <pre>{details}</pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(details).then(() => setCopied(true));
        }}
      >
        {copied ? 'Copied' : 'Copy details'}
      </button>
    </div>
  );
}

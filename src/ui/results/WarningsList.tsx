// The warnings with their tips (design file 47). The warnings themselves are
// built in stage 6; until then the list is empty.
import { usePlan } from '../../state/react';

export function WarningsList() {
  const count = usePlan((s) => s.result?.warnings.length ?? 0);
  return (
    <section aria-labelledby="warnings-h">
      <h3 id="warnings-h">Warnings</h3>
      {count === 0 ? <p className="hint">No warnings under these assumptions.</p> : null}
    </section>
  );
}

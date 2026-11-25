// The warnings with their tips (design file 47; mockup Results). The warnings
// themselves are built in stage 6; until then the list is empty.
import { usePlan } from '../../state/react';

export function WarningsList() {
  const count = usePlan((s) => s.result?.warnings.length ?? 0);
  return (
    <section className="card" aria-labelledby="warnings-h">
      <h2 id="warnings-h" className="card-title">
        Warnings
      </h2>
      {count === 0 && <p className="note">No warnings under these assumptions.</p>}
    </section>
  );
}

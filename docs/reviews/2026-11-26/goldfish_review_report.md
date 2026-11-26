# Goldfish Annotated Review Report

**Target:** `docs/designs/retirement-planner.md` (full file; the Stage A amendment)

**Findings list:** the 17 action items in [consolidated_review_report.md](consolidated_review_report.md) (CB1, C1–C16). Each groups the raw findings listed in its matrix. The Nits are declined (recorded, not fixed), except the dead FP Canada link, which is fixed under C12.

**Status: resolved** (2026-11-26). All 17 items were decided with the author and applied to the design and the brief. 17 accepted, 0 contested, 0 escalated; the Nits are declined (recorded) except the dead FP Canada link. The design's rule citations are still to be read from their sources in Stage A's first step (BA-7).

## Prioritized Findings & AI Suggestions

### [CB1] The migrated home doesn't reproduce the version 1 numbers. Reviewers: zoom-out, comprehension. Severity: Blocker

* **AI suggestion:** PROPOSE FIX (the author chooses the home model).
* **Justification:** The finding is valid. `death.ts:106` values the home with `deflator(yearIndex)`, while the draft's asset is grown in step 7 and deemed sold at its end-of-year value. The options are one home model (with the protected reference plan updated once, with the author's approval), an adapter, or valuing every deemed sale at its start-of-year value.
* **Decision:** Accepted with the author's own rule (2026-11-26): no plan file compatibility before the production release. One home model; the plan file stays schema version 1, changed in place, with no migration; G15 withdrawn. The protected reference plan is rebuilt in Stage A, the author reviewing the fixture diff (design decision A7).

### [C1] Working-year cash flow: reuse the year solver. Severity: Major

* **AI suggestion:** PROPOSE FIX.
* **Justification:** Valid. `solveYear` already handles a still-working spouse (`yearSolve.ts:172`, `260–273`). Routing working years that have living costs through it removes the new hand-built cash flow, its invariant and the missing RRSP draw, and keeps A8 (an empty field means the old path, so the reference plan is unchanged).
* **Proposed edit:** rewrite the "Working years" block of "Assets in the year (Stage A)" and SA14 to say that working years with living costs run through `solveYear`, with the need = 12 × the monthly amount × the inflation factor; asset steps run in every year.
* **Decision:** Accepted: working years run through the year solver; living costs while working are required while anyone works (A8 dropped; design decision A5).

### [C2] Tax on asset income while working. Severity: Major

* **AI suggestion:** PROPOSE FIX, plus the author's rule for a rental loss larger than other income.
* **Justification:** Valid. A flat marginal rate misstates large gains and floors rental losses at $0 for working owners, which brings back the rejected Alternative AL.
* **Proposed edit:** carry `grossPayNom` through `units.ts`. Tax a working spouse's extra income as `personalTax(pay + income) − personalTax(pay)`, in `split.ts`. State the rule for a loss larger than other income.
* **Decision:** Accepted, with the author's rule: a rental operating loss larger than other income is carried forward (design decision A8).

### [C3] Purchases: financing, shortfall and price growth. Severity: Major

* **AI suggestion:** PROPOSE FIX.
* **Proposed edit:**
  * cash out = price − the new mortgage;
  * the new mortgage in today's dollars, capped at the price;
  * one price-growth rule (inflation, as the units section says);
  * an unfunded purchase shown as a debt line in the estate;
  * define the downsize fields (new home's owner as the old home's, costs carried over unless edited, a new mortgage as an amount).
* **Decision:** Accepted as proposed (design decision A9).

### [C4] Asset events and the module interface. Severity: Major

* **AI suggestion:** PROPOSE FIX.
* **Proposed edit:**
  * build the event list in `normalizeInputs`;
  * hook the asset calls into `prepareYear`, after the death transfers;
  * work out the year's amortization at the start of the year;
  * use three calls with written signatures;
  * cover deaths in the same year.
* **Decision:** Accepted as proposed (design decision A1, A2).

### [C5] Spending overlap: one mechanism. Severity: Major

* **AI suggestion:** PROPOSE FIX (reverses AD14 and A10, so the author decides).
* **Decision:** Accepted under the author's rule: every proposed fix that follows Canadian rules and is the simplest option is accepted, and anything else is raised. Nothing was raised. One notice in every spending mode (design decision A4).

### [C6] Vehicles. Severity: Major

* **AI suggestion:** PROPOSE FIX (Stage 8's option reverses part of AD21, so the author decides).
* **Decision:** Accepted under the author's rule: every proposed fix that follows Canadian rules and is the simplest option is accepted, and anything else is raised. Nothing was raised. Vehicles keep a falling value with a yearly replacement cost; no loans (A10).

### [C7] The cottage comparison. Severity: Major

* **AI suggestion:** PROPOSE FIX (cutting it reverses part of AD20, so the author decides).
* **Decision:** Accepted under the author's rule: every proposed fix that follows Canadian rules and is the simplest option is accepted, and anything else is raised. Nothing was raised. The cottage comparison is cut (A11, BA-2).

### [C8] Input contract, types and validation. Severity: Major

* **AI suggestion:** PROPOSE FIX.
* **Proposed edit:**
  * a field table per kind, with ranges, defaults and the validation rules from the brief;
  * rates given as fractions;
  * version 1 and version 2 types, and `PlanDraftV2`;
  * a missing `realAssets` counts as `[]`;
  * readiness paths by id;
  * import decides by the file's `schemaVersion`.
* **Decision:** Accepted under the author's rule: every proposed fix that follows Canadian rules and is the simplest option is accepted, and anything else is raised. Nothing was raised.

### [C9] Tax and estate details. Severity: Major

* **AI suggestion:** PROPOSE FIX.
* **Proposed edit:**
  * route asset gains through `gainsBy`;
  * name the two losses ("rental operating loss", "capital loss on selling a rental");
  * every strategy runs with assets;
  * state which income each strategy counts;
  * write the probate formula and signature;
  * reword the compounding source as "the usual Canadian practice for fixed-rate mortgages, to be confirmed from source (BA-7)";
  * keep the new figures in the `realAssets` record.
* **Decision:** Accepted under the author's rule: every proposed fix that follows Canadian rules and is the simplest option is accepted, and anything else is raised. Nothing was raised.

### [C10] Results and screens: data paths. Severity: Major

* **AI suggestion:** PROPOSE FIX.
* **Proposed edit:**
  * name each new field and where it's displayed;
  * list the 14 breakdown rows;
  * draw a negative rent as a line, not an area;
  * add the tab's `case 'assets'`;
  * state the CSV layout and the year-end conversion.
* **Decision:** Accepted under the author's rule: every proposed fix that follows Canadian rules and is the simplest option is accepted, and anything else is raised. Nothing was raised.

### [C11] Persistence and Import. Severity: Major

* **AI suggestion:** PROPOSE FIX.
* **Proposed edit:**
  * correct file 43 (Import and Export exist since 2026-11-26);
  * wire the migration into Import in Stage A;
  * drop the two-key autosave rule until autosave exists.
* **Decision:** Accepted under the author's rule: every proposed fix that follows Canadian rules and is the simplest option is accepted, and anything else is raised. Nothing was raised.

### [C12] The merge: superseded text and tab lists. Severity: Major

* **AI suggestion:** PROPOSE FIX.
* **Proposed edit:**
  * edit the base text in place at each of the places the critic listed;
  * fix the tab lists;
  * fix Goal 1's range;
  * reconcile the phone layout with Future Improvements;
  * remove the duplicate bullet;
  * say "schema version";
  * replace the dead FP Canada link.
* **Decision:** Accepted under the author's rule: every proposed fix that follows Canadian rules and is the simplest option is accepted, and anything else is raised. Nothing was raised.

### [C13] Decision ids and traceability. Severity: Major

* **AI suggestion:** PROPOSE FIX.
* **Proposed edit:**
  * define the id families in one paragraph;
  * rename the clashing ids;
  * state the content wherever an id is the only explanation;
  * record the 2026-11-26 decisions in this folder;
  * add the alternatives for A8–A10 and the valuation timing.
* **Decision:** Accepted under the author's rule: every proposed fix that follows Canadian rules and is the simplest option is accepted, and anything else is raised. Nothing was raised.

### [C14] The build plan: steps, file lists, tests and gate. Severity: Major

* **AI suggestion:** PROPOSE FIX.
* **Proposed edit:**
  * reorder the steps: engine first, schema and Import last;
  * a complete write list;
  * a named test for every change;
  * a gate that includes this report;
  * one BA-7 deadline (step 1).
* **Decision:** Accepted under the author's rule: every proposed fix that follows Canadian rules and is the simplest option is accepted, and anything else is raised. Nothing was raised.

### [C15] Speed. Severity: Major

* **AI suggestion:** PROPOSE FIX.
* **Proposed edit:** time a 6-asset plan before the cap is fixed, and state the check's plan, machine and pass rule, consistent with the accepted tips deferral.
* **Decision:** Accepted under the author's rule: every proposed fix that follows Canadian rules and is the simplest option is accepted, and anything else is raised. Nothing was raised.

### [C16] Risks, glossary and wording. Severity: Major

* **AI suggestion:** PROPOSE FIX.
* **Proposed edit:**
  * one Stage A row group in Risks;
  * Glossary terms;
  * rename `realAssets` (for example `ownedAssets`);
  * "today's dollars" used only as a unit;
  * no new warning.
* **Decision:** Accepted under the author's rule: every proposed fix that follows Canadian rules and is the simplest option is accepted, and anything else is raised. Nothing was raised.

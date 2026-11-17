# Admin guide: updating the config

The admin is the author, for now. Run this each January for the new tax year.

Rule values are never typed in from memory, by a person or an AI. They are fetched from the
official pages listed in [config/SOURCES.md](../config/SOURCES.md), twice, independently, and the
two results are compared.

## Steps

1.  **Prepare the year.** Copy `config/<last year>/` to `config/<new year>/`. Set every rule-value
    entry (not author decisions) to `value: null`, `fetchedOn: null`,
    `validation: { "status": "unfetched" }`, and update `taxYear`.
2.  **Check the source list.** Make sure every rule-value key in `config/SOURCES.md` has a source
    URL and a "where on the page" note. Fix any page that has moved.
3.  **Fetch twice.** Start two separate AI sessions. Give each one only `config/SOURCES.md`, the
    entry format from the design's Config contract, and this instruction: fetch every rule value
    from its listed page and write a candidate file per config file (`candidate-a/` and
    `candidate-b/`, outside `config/`). Neither session may see the other's output.
4.  **Compare.** For each config file:

    ```sh
    npm run config:compare -- candidate-a/federal.json candidate-b/federal.json
    ```

5.  **Resolve disagreements.** For each difference, open the source page and decide the correct
    value yourself.
6.  **Validate.** Copy the agreed values into `config/<new year>/`. For each entry, set
    `fetchedOn`, `source.url`, `source.locator`, and
    `validation: { "status": "validated", "by": "<your name>", "on": "<date>" }`.
7.  **Review planning choices.** Read `planning.json` and `warnings.json`. They are not fetched,
    but check they still make sense.
8.  **Switch the year.** Write the new year into `config/CURRENT_YEAR`, then run:

    ```sh
    npm run config:bundle
    npm run config:check -- --strict
    ```

9.  **Commit** the config, `CURRENT_YEAR` and the regenerated `src/engine/config/bundle.ts`.

OAS amounts change each quarter. The config uses the January amount × 12, updated once a year.

## What the app shows

The app shows the tax year in use. It shows a notice when any value is unfetched or unvalidated,
or when the current year is later than the config's tax year.

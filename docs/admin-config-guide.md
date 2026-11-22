# Admin guide: updating the config

The admin is the author, for now. Refreshing the defaults is optional: users can change any rule value in Settings, and indexed values grow from the defaults' tax year. When you do refresh (for example each January), follow these steps for the new tax year. If you refresh, also check that the CANSIM V122487 rate is still 6% or less, because the Ontario LIF maximum table assumes it.

Rule values are never typed in from memory, by a person or an AI. They are fetched from the
pages listed in [config/SOURCES.md](../config/SOURCES.md). Tax and benefit rules
(`federal.json`, `ontario.json`) are fetched twice, independently, and compared, because an error
there gives a wrong tax or benefit amount in every plan. Market assumptions (`market.json`) and
the FP Canada life-expectancy tables (`planning.life_expectancy.*`) are estimates, so they are
fetched once and you spot-check them.

## Steps

1.  **Prepare the year.** Copy `config/<last year>/` to `config/<new year>/`. Set every sourced
    entry (every key whose `SOURCES.md` row has a URL, including `planning.life_expectancy.*`) to
    `value: null`, `fetchedOn: null`, `validation: { "status": "unfetched" }`. Update `taxYear` on
    every entry.
2.  **Check the source list.** Make sure every sourced key in `config/SOURCES.md` has a source URL
    and a "where on the page" note. Fix any page that has moved. Rows marked **TO CHOOSE** stay
    unfetched until you pick a source.
3.  **Fetch.** Start two separate AI sessions. Give each one only `config/SOURCES.md`, the entry
    format from the design's Config contract, and an instruction naming what to fetch. Each writes
    a candidate file per config file, outside `config/` (`candidate-a/`, `candidate-b/`). Neither
    session may see the other's output.
    *   Session A fetches `federal.json`, `ontario.json`, `market.json` and
        `planning.life_expectancy.*`.
    *   Session B fetches `federal.json` and `ontario.json` only.
    *   Both sessions fetch fsrao.ca pages with curl (see `SOURCES.md`). Neither fetches Ontario
        probate: you read the Estate Administration Tax Act yourself.
4.  **Compare** the two tax and benefit candidates:

    ```sh
    npm run config:compare -- candidate-a/federal.json candidate-b/federal.json
    npm run config:compare -- candidate-a/ontario.json candidate-b/ontario.json
    ```

5.  **Resolve and spot-check.** For each difference in step 4, open the source page and decide the
    correct value yourself. For the values fetched once (market assumptions and life
    expectancy), open each source page and check at least the value and its as-of date.
6.  **Validate.** Copy the agreed values into `config/<new year>/`. For each entry, set
    `fetchedOn`, `source.url`, `source.locator`, and
    `validation: { "status": "validated", "by": "<your name>", "on": "<date>" }`.
7.  **Review planning choices.** Read `planning.json` and `warnings.json`. The planning choices
    other than life expectancy are not fetched, but check they still make sense.
8.  **Switch the year.** Write the new year into `config/CURRENT_YEAR`, then run:

    ```sh
    npm run config:bundle
    npm run config:check -- --strict
    ```

9.  **Commit** the config, `CURRENT_YEAR` and the regenerated `src/engine/config/bundle.ts`.

OAS and CPP amounts are published monthly. The config stores them as published
(`CAD_per_month`), using the January figure, updated once a year; the loader multiplies them by 12.
OAS changes each quarter, so the January figure × 12 slightly understates a full year; this is an
accepted approximation.

## What the app shows

The app shows the tax year in use. It shows a notice when any value is unfetched or unvalidated,
or when the current year is later than the config's tax year.

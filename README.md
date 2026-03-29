# TimeNets New

This project is a port of the original TimeNets ActionScript code written by Nam Wook Kim.

It is also a tribute to his work on genealogical visualization and the original TimeNets research, which remains the foundation for this codebase.

- Original ActionScript repository: https://github.com/namwkim/timenets
- Research page: https://idl.uw.edu/papers/timenets
- Nam Wook Kim research page: https://www.namwkim.org/

## Run locally

Install dependencies and start the development server from the `timenets-new` folder:

```sh
pnpm install
pnpm dev
```

To build the static assets:

```sh
pnpm build
```

To run the automated checks:

```sh
pnpm test
```

## Project shape

- `src/App.tsx` wires the offline workspace state.
- `src/components/TimelineCanvas.tsx` renders the timeline ribbons and interaction model.
- `src/components/InspectorPanel.tsx` exposes lightweight editing for core genealogy records.
- `src/lib/layout.ts` computes the hourglass, pedigree, and descendant views.
- `src/lib/gedcom.ts` converts GEDCOM records into the TimeNets JSON schema.
- `src/data/demoProject.ts` provides the built-in dataset.

## Current limits

- GEDCOM import currently targets the most common `INDI` and `FAM` structures rather than every GEDCOM dialect extension.
- The layout engine is closer to the legacy Flash behavior now, but it is still not a one-to-one port of the original block aggregation and DOI simplification logic.
- Document management remains intentionally excluded from this milestone.
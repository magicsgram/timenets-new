# TimeNets JS

This folder now contains the first implementation pass of the standalone TimeNets rewrite: a static React and TypeScript app with an offline genealogy model, a TimeNets-inspired SVG visualization, local JSON import and export, and editor panels for people, marriages, and events.

## What is implemented

- Vite-based static app output that works from local hosting.
- TimeNets-style lifeline ribbons with red and blue gender encoding, orange event markers, and marriage connectors.
- Three representation modes: hourglass, pedigree, and descendant.
- Root-person switching, selection, mouse drag panning, wheel zooming, and DOI-based emphasis.
- Local JSON and GEDCOM import, JSON export, and local-storage persistence for the active project.
- Editable demo dataset seeded from the legacy domain concepts.
- Root-centered layout ordering that keeps ancestors above the focus person and descendants below, closer to the legacy Flash behavior.

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

## Deploy to GitHub Pages

This repo is configured to publish the app to GitHub Pages through GitHub Actions.

Deployment workflow:

- The workflow file lives at `.github/workflows/deploy-pages.yml` in this repository.
- A push to `main` or `master` will build this app and deploy `dist/` to GitHub Pages.
- Manual deployment is also available through the `workflow_dispatch` trigger in GitHub Actions.

Required GitHub repo setting:

1. Open the GitHub repository settings.
2. Go to Pages.
3. Set the source to `GitHub Actions`.

If the repository does not yet have a GitHub remote, create one and push this folder as its own repository before expecting Pages deployment to run.

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
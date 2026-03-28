## Plan: Static TimeNets Web Rewrite

Build a visualization-first standalone web app in `timenets-new` using a static-build architecture (recommended: Vite + React + TypeScript). Preserve the TimeNets concept from the paper and legacy app: temporal lifelines per person, blue/red gender encoding, orange event markers, relationship merges, focus+context navigation, and genealogy editing with file-based import/export instead of any server dependency.

**Steps**
1. Phase 1: Foundation. Initialize the app in `timenets-new` as a static SPA with TypeScript, a bundler that outputs plain static assets, hash-based routing if routing is needed, linting, and a minimal design system. This phase blocks all others.
2. Phase 1: Establish the visual direction from the first-page diagram and `public/images/introvis.png`: dark neutral background, layered red/blue spline lifelines, orange event nodes, subdued axis/grid treatment, gold focus accents, and side panels that do not compete with the diagram. This can run with the app-shell setup in step 1.
3. Phase 2: Define the offline domain model by translating the legacy Ruby and ActionScript entities into frontend types: `Person`, `Marriage`, `Event`, `Project`, `DocumentRef` (if retained only as metadata), uncertainty flags, and selection/focus state. Reuse semantics from `app/models/person.rb`, `app/models/marriage.rb`, `app/models/event.rb`, and the ActionScript value objects. Depends on step 1.
4. Phase 2: Design the client data layer for file-based operation only. Recommended format: canonical JSON project schema for save/load, optional GEDCOM import adapter, and export back to JSON. Use browser file input and download flows, with File System Access API as an optional enhancement, not a requirement. Depends on step 3.
5. Phase 2: Seed the app with a built-in demo dataset derived from the existing repo concepts so the visualization works immediately when statically opened. This can run in parallel with step 4 after step 3.
6. Phase 3: Rebuild the layout engine as a pure client module. Port the behavior, not the code, from `vis/genvis/src/genvis/vis/operator/layout/LifelineLayout.as` and related visualization classes: compute time scale, vertical ordering, marriage/child connection geometry, and the three legacy representation modes (hourglass first, pedigree and descendant next). Depends on step 3.
7. Phase 3: Implement SVG-based rendering for lifelines, event markers, relationship connectors, labels, uncertainty styling, and focus highlighting. Recommended approach: SVG for paths and labels, with D3 utilities only for scales/path generation if helpful. Depends on step 6.
8. Phase 3: Implement interaction parity for the visualization-first milestone: pan/zoom, focus person, selection, hover details, root change, visible time-span control, and degree-of-interest compression/expansion inspired by the legacy fisheye behavior. Depends on steps 6 and 7.
9. Phase 4: Build the non-server UI around the diagram: left or right inspector panel for selected person/event details, lightweight editors for people/marriages/events, import/export controls, representation-mode switcher, and a startup screen for opening a local project or demo dataset. Depends on steps 4, 7, and 8.
10. Phase 4: Decide how much of the old project dashboard to preserve in the first milestone. Recommended: keep only the useful parts for static use, namely people/events list views and editor panels; deliberately exclude collaboration, invitations, activities, authentication, and remote document management. Depends on step 9.
11. Phase 5: Add quality and portability hardening: static asset paths that work from local hosting, no API assumptions, graceful empty-state handling, autosave warnings for unsaved file changes, keyboard shortcuts, and responsive behavior for desktop and tablet widths. Depends on steps 8 and 9.
12. Phase 5: Add automated verification around pure logic modules first: layout calculations, date-span handling, uncertainty rendering rules, and import/export round trips. Then add manual visual comparison against `public/images/introvis.png` and the paper’s first-page aesthetic. Depends on steps 4 through 11.

**Relevant files**
- `timenets/2010-TimeNets-AVI.pdf` — conceptual source for the visualization technique, terminology, and first-page diagram target.
- `timenets/public/images/introvis.png` — strongest concrete visual reference for the final diagram look.
- `timenets/app/views/person/visualize.html.erb` — legacy visualization entry point and root-selection handoff behavior.
- `timenets/vis/genvis/src/genvis/GenVis.as` — central visualization orchestration, interaction toggles, colors, and display concepts.
- `timenets/vis/genvis/src/genvis/vis/operator/layout/LifelineLayout.as` — primary behavioral reference for the layout engine and time scaling.
- `timenets/app/models/person.rb` — person semantics, family relations, and file-upload legacy behavior to exclude from the static rewrite.
- `timenets/app/models/marriage.rb` — marriage interval semantics and uncertainty fields.
- `timenets/app/models/event.rb` — event semantics and project linkage.
- `timenets/app/views/project/show_project.html.erb` — reference for secondary people/events/documents workflows to simplify into an offline UI.
- `timenets/README` — concise statement of project purpose and paper linkage.
- `timenets-new` — target location for the new standalone application.

**Verification**
1. Open the built app from a static host and confirm it runs with no network calls for application data and no server dependency.
2. Load the demo dataset and verify the default view visually matches the TimeNets style: red/blue lifelines, orange event markers, dark canvas, and merged relationship flows.
3. Import a JSON project file, edit people/marriages/events, export it, reload it, and confirm a lossless round trip for supported fields.
4. Validate root-change, selection, pan/zoom, and time-span controls against the behaviors implied by `GenVis.as` and `visualize.html.erb`.
5. Add unit tests for layout ordering, time-scale bounds, marriage connector placement, uncertainty-state formatting, and import/export normalization.
6. Manually compare hourglass mode against the legacy screenshot/diagram and verify pedigree/descendant modes only after hourglass is stable.

**Decisions**
- Included in first implementation: standalone static app, TimeNets visualization, local JSON save/load, optional GEDCOM import, people/marriage/event editing, and a design faithful to the first-page diagram.
- Excluded from first implementation: Rails backend, AMF/RubyAMF, authentication, collaboration, invitations, server-backed documents, activity feeds, and any runtime server requirement.
- Recommended architecture: React + TypeScript + SVG rendering + pure layout engine modules + local file adapters.
- Recommended sequencing: ship hourglass visualization first, then add pedigree and descendant layouts, because hourglass most directly matches the TimeNets introductory figure and legacy defaults.
- Recommended migration stance: preserve behavior and concepts from the ActionScript code, but do not attempt a line-by-line port.

**Further Considerations**
1. GEDCOM scope. Recommendation: support GEDCOM import after the canonical JSON schema is stable, because JSON is the safer internal format for deterministic client-side editing.
2. Document handling. Recommendation: treat documents as lightweight metadata or external file links in the first milestone rather than recreating the old upload workflow.
3. Performance strategy. Recommendation: keep rendering in SVG initially for clarity and fidelity; only introduce canvas or worker-based optimization if real datasets expose bottlenecks.
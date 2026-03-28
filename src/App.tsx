import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { TimelineCanvas } from './components/TimelineCanvas';
import { Toolbar } from './components/Toolbar';
import { emptyProject } from './data/demoProject';
import { createTimelineLayout } from './lib/layout';
import { downloadProject, parseImportedProject, extractViewSettings } from './lib/io';
import type { ViewSettings } from './lib/io';
import type { ProjectData, VisibleRange } from './types/domain';

const storageKey = 'timenets-new-project';


export default function App() {
  const [project, setProject] = useState<ProjectData>(emptyProject);
  const [rootId, setRootId] = useState(project.rootPersonId);
  const [selectedPersonId, setSelectedPersonId] = useState(project.rootPersonId);
  const [range, setRange] = useState<VisibleRange | null>(null);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [curvature, setCurvature] = useState(2);
  const [spacing, setSpacing] = useState(28);
  const [rootCentric, setRootCentric] = useState(false);
  const [, setStatus] = useState('Loaded demo dataset.');

  const deferredProject = useDeferredValue(project);

  const layout = useMemo(() => {
    return createTimelineLayout({
      project: deferredProject,
      rootId,
      mode: 'hourglass',
      focusId: selectedPersonId,
      doiRadius: Infinity,
      visibleRange: range ?? undefined,
      customOrder: customOrder.length > 0 ? customOrder : undefined,
    });
  }, [deferredProject, range, rootId, selectedPersonId, customOrder]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(project));
  }, [project]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const setProjectAndSync = (nextProject: ProjectData, message: string) => {
    startTransition(() => {
      setProject(nextProject);
      setRootId(nextProject.rootPersonId);
      setSelectedPersonId(nextProject.rootPersonId);
      setRange(null);
      setCustomOrder(nextProject.people.map((p) => p.id));
      setStatus(message);
    });
  };

  const handleRootChange = (nextRootId: string) => {
    startTransition(() => {
      setRootId(nextRootId);
      setSelectedPersonId(nextRootId);
      setRange(null);
      setStatus('Root person changed.');
    });
  };

  const applyViewSettings = (settings: ViewSettings) => {
    if (settings.curvature !== undefined) setCurvature(settings.curvature);
    if (settings.spacing !== undefined) setSpacing(settings.spacing);
    if (settings.rootCentric !== undefined) setRootCentric(settings.rootCentric);
    if (settings.customOrder !== undefined) setCustomOrder(settings.customOrder);
    if (settings.rootId !== undefined) setRootId(settings.rootId);
  };

  const handleImport = async (file: File) => {
    try {
      const source = await file.text();
      const imported = parseImportedProject(source, file.name);
      setProjectAndSync(imported, `Imported ${file.name}.`);
      // Try to extract view settings from JSON files
      try {
        const parsed = JSON.parse(source) as unknown;
        const settings = extractViewSettings(parsed);
        if (settings) applyViewSettings(settings);
      } catch {
        // Not JSON (e.g. GEDCOM) — no view settings to restore
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.';
      setStatus(message);
    }
  };

  return (
    <div className="app-shell">
      <div className="aurora aurora-left" />
      <div className="aurora aurora-right" />

      <main className="workspace-grid">
        <div className="canvas-pane">
          <TimelineCanvas
            project={project}
            layout={layout}
            selectedPersonId={selectedPersonId}
            rootId={rootId}
            curvature={curvature}
            spacing={spacing}
            rootCentric={rootCentric}
            onSelectPerson={setSelectedPersonId}
            onRootChange={handleRootChange}
          />
        </div>

        <Toolbar
          project={project}
          rootId={rootId}
          visibleSpan={layout.range.endYear - layout.range.startYear}
          curvature={curvature}
          spacing={spacing}
          orderedPeople={layout.people.map((p) => p.person)}
          onRootChange={handleRootChange}
          onVisibleSpanChange={(span) => {
            const center = Math.round((layout.range.startYear + layout.range.endYear) / 2);
            setRange({ startYear: center - Math.floor(span / 2), endYear: center + Math.ceil(span / 2) });
          }}
          onCurvatureChange={setCurvature}
          onSpacingChange={setSpacing}
          rootCentric={rootCentric}
          onRootCentricChange={setRootCentric}
          onReorder={(ids) => setCustomOrder(ids)}
          onResetOrder={() => setCustomOrder([])}
          onImportFile={(file) => {
            void handleImport(file);
          }}
          onExport={() => {
            const settings: ViewSettings = { curvature, spacing, rootCentric, customOrder, rootId };
            downloadProject(project, settings);
            setStatus('Exported project JSON.');
          }}
          onLoadDemo={(demo) => setProjectAndSync(demo.project, `Loaded ${demo.name}.`)}
        />
      </main>
    </div>
  );
}
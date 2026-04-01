import { useEffect, startTransition, useDeferredValue, useMemo, useState } from 'react';
import { TimelineCanvas } from './components/TimelineCanvas';
import { Toolbar } from './components/Toolbar';
import { emptyProject, fetchDemoEntries, fetchDemoProject } from './data/demoProject';
import { useProjectPersistence } from './hooks/useProjectPersistence';
import { useViewSettings } from './hooks/useViewSettings';
import { createTimelineLayout } from './lib/layout';
import { downloadProject, parseImportedProject, extractViewSettings } from './lib/io';
import type { ViewSettings } from './lib/io';
import type { ProjectData, VisibleRange } from './types/domain';

const storageKey = 'timenets-new-project';


export default function App() {
  const [project, setProject] = useState<ProjectData>(emptyProject);
  const [rootId, setRootId] = useState(project.rootPersonId);
  const [selectedPersonId, setSelectedPersonId] = useState(project.rootPersonId);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [range, setRange] = useState<VisibleRange | null>(null);
  const {
    curvature,
    setCurvature,
    spacing,
    setSpacing,
    rootCentric,
    setRootCentric,
    customOrder,
    setCustomOrder,
    applyViewSettings,
    serializedViewSettings,
  } = useViewSettings();
  const [, setStatus] = useState('Loaded demo dataset.');

  const deferredProject = useDeferredValue(project);

  useProjectPersistence(project, storageKey);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme');
    if (themeParam === 'dark' || themeParam === 'light') {
      setTheme(themeParam as 'dark' | 'light');
    }

    const demoParam = params.get('demo');
    if (demoParam) {
      fetchDemoEntries().then((entries) => {
        const demo = entries.find((e) => e.id === demoParam);
        if (demo) {
          fetchDemoProject(demo).then((proj) => {
            setProjectAndSync(proj, `Loaded ${proj.meta.name}.`);
          });
        } else {
          setProjectAndSync(emptyProject, 'Invalid demo.');
        }
      }).catch(() => {
        setProjectAndSync(emptyProject, 'Error loading demos.');
      });
    }
  }, []); // run only once on mount

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    const url = new URL(window.location.href);
    url.searchParams.set('theme', newTheme);
    window.history.replaceState({}, '', url.toString());
  };

  const layout = useMemo(() => {
    return createTimelineLayout({
      project: deferredProject,
      rootId,
      mode: 'hourglass',
      focusId: selectedPersonId,
      visibleRange: range ?? undefined,
      customOrder: customOrder.length > 0 ? customOrder : undefined,
    });
  }, [deferredProject, range, rootId, selectedPersonId, customOrder]);

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

  const handleApplyViewSettings = (settings: ViewSettings) => {
    applyViewSettings(settings);
    if (settings.rootId !== undefined) {
      setRootId(settings.rootId);
    }
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
        if (settings) handleApplyViewSettings(settings);
      } catch {
        // Not JSON (e.g. GEDCOM) — no view settings to restore
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.';
      setStatus(message);
    }
  };

  return (
    <div className="app-shell" data-theme={theme}>
      <div className="aurora aurora-left" />
      <div className="aurora aurora-right" />

      <main className="workspace-grid">
        <div className="canvas-pane">
          <TimelineCanvas
            project={project}
            layout={layout}
            selectedPersonId={selectedPersonId}
            rootId={rootId}
            theme={theme}
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
          theme={theme}
          onThemeChange={handleThemeChange}
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
            const settings: ViewSettings = { ...serializedViewSettings, rootId };
            downloadProject(project, settings);
            setStatus('Exported project JSON.');
          }}          onExportSvg={() => {
            const svgElement = document.querySelector('.timeline-canvas');
            if (svgElement) {
              const clone = svgElement.cloneNode(true) as SVGSVGElement;
              const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
              const bg = theme === 'light' ? '#f5f7f9' : '#050607';
              const textFill = theme === 'light' ? '#2e3436' : '#dfe6ee';
              const gridStroke = theme === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.07)';
              const yearLabel = theme === 'light' ? 'rgba(46, 52, 54, 0.58)' : 'rgba(237, 242, 247, 0.48)';
              const baselineStroke = theme === 'light' ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.12)';
              
              style.textContent = `
                .year-grid { stroke: ${gridStroke}; stroke-width: 1; stroke-dasharray: 2 12; }
                .year-label { fill: ${yearLabel}; font-size: 11px; text-anchor: middle; font-family: "Segoe UI", "Aptos", sans-serif; }
                .baseline { stroke: ${baselineStroke}; stroke-width: 1; }
                .person-label { fill: ${textFill}; font-size: 13px; letter-spacing: 0.01em; cursor: pointer; font-family: "Segoe UI", "Aptos", sans-serif; }
                .person-label.is-selected { fill: ${theme === 'light' ? '#b06500' : '#fff3cd'}; }
                .person-label.is-root { font-weight: 700; }
                .generation-label { fill: ${theme === 'light' ? 'rgba(0, 0, 0, 0.38)' : 'rgba(255, 255, 255, 0.28)'}; font-size: 10px; font-family: "Segoe UI", "Aptos", sans-serif; }
                .person-path-core { stroke-linejoin: round; }
                .person-path-core.is-selected { filter: drop-shadow(0 0 8px ${theme === 'light' ? 'rgba(241, 178, 82, 0.7)' : 'rgba(241, 178, 82, 0.42)'}); }
              `;
              clone.style.backgroundColor = bg;
              // Also update the <rect> background inside SVG if it exists
              const bgRect = clone.querySelector('rect[fill="#050607"], rect[fill="#f5f7f9"]');
              if (bgRect) {
                 // @ts-ignore
                 bgRect.setAttribute('fill', bg);
              }
              clone.insertBefore(style, clone.firstChild);
              const serializer = new XMLSerializer();
              const svgString = serializer.serializeToString(clone);
              const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${project.meta.name.replace(/\s+/g, '-') || 'timenets'}-timeline.svg`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              setStatus('Exported SVG.');
            }
          }}
          onLoadDemo={(project, demoId) => {
            setProjectAndSync(project, `Loaded ${project.meta.name}.`);
            const url = new URL(window.location.href);
            url.searchParams.set('demo', demoId);
            window.history.pushState({}, '', url.toString());
          }}
        />
      </main>
    </div>
  );
}
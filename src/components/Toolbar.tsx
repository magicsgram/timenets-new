import { useState, type ChangeEvent } from 'react';
import type { Person, ProjectData } from '../types/domain';
import { demoEntries, type DemoEntry } from '../data/demoProject';

interface ToolbarProps {
  project: ProjectData;
  rootId: string;
  visibleSpan: number;
  curvature: number;
  spacing: number;
  rootCentric: boolean;
  orderedPeople: Person[];
  onRootChange: (rootId: string) => void;
  onVisibleSpanChange: (years: number) => void;
  onCurvatureChange: (value: number) => void;
  onSpacingChange: (value: number) => void;
  onRootCentricChange: (value: boolean) => void;
  onReorder: (ids: string[]) => void;
  onResetOrder: () => void;
  onImportFile: (file: File) => void;
  onExport: () => void;
  onLoadDemo: (demo: DemoEntry) => void;
}

export function Toolbar(props: ToolbarProps) {
  const {
    project,
    rootId,
    visibleSpan,
    curvature,
    spacing,
    orderedPeople,
    onRootChange,
    onVisibleSpanChange,
    onCurvatureChange,
    onSpacingChange,
    rootCentric,
    onRootCentricChange,
    onReorder,
    onResetOrder,
    onImportFile,
    onExport,
    onLoadDemo,
  } = props;

  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportFile(file);
      event.target.value = '';
    }
  };

  return (
    <aside className="toolbar">
      <div>
        <h1>{project.meta.name}</h1>
      </div>

      <div className="toolbar-controls">
        <div className="slider-group">
        <label>
          Horizontal zoom: {visibleSpan}y
          <input
            type="range"
            min={1}
            max={300}
            step={1}
            value={visibleSpan}
            onChange={(event) => onVisibleSpanChange(Number(event.target.value))}
          />
        </label>

        <label>
          Curvature: {curvature}y
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.5}
            value={curvature}
            onChange={(event) => onCurvatureChange(Number(event.target.value))}
          />
        </label>

        <label>
          Spacing: {spacing}px
          <input
            type="range"
            min={20}
            max={60}
            step={4}
            value={spacing}
            onChange={(event) => onSpacingChange(Number(event.target.value))}
          />
        </label>
        </div>

        <label>
          Root
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 'normal' }}>
            <input type="checkbox" checked={rootCentric} onChange={(e) => onRootCentricChange(e.target.checked)} style={{ margin: 0 }} />
            centric
          </span>
          <select value={rootId} onChange={(event) => onRootChange(event.target.value)}>
            {project.people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.firstName} {person.lastName}
              </option>
            ))}
          </select>
        </label>

        <div className="reorder-section">
          <div className="reorder-header">
            <span className="reorder-title">Lane order</span>
            <button type="button" className="reorder-reset" onClick={onResetOrder}>Auto</button>
          </div>
          <ol className="reorder-list">
            {orderedPeople.map((person, idx) => {
              const moveUp = () => {
                if (idx === 0) return;
                const ids = orderedPeople.map((p) => p.id);
                [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                onReorder(ids);
              };

              const moveDown = () => {
                if (idx === orderedPeople.length - 1) return;
                const ids = orderedPeople.map((p) => p.id);
                [ids[idx + 1], ids[idx]] = [ids[idx], ids[idx + 1]];
                onReorder(ids);
              };

              return (
                <li key={person.id} className="reorder-item">
                  <span className="reorder-name">{person.firstName} {person.lastName}</span>
                  <span className="reorder-buttons">
                    <button type="button" disabled={idx === 0} onClick={moveUp} aria-label="Move up">&#x25B2;</button>
                    <button type="button" disabled={idx === orderedPeople.length - 1} onClick={moveDown} aria-label="Move down">&#x25BC;</button>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="toolbar-actions">
          <label className="button-like">
            Load
            <input type="file" accept="application/json,.json,.ged,.gedcom,text/plain" onChange={handleFileInput} hidden />
          </label>
          <button type="button" onClick={onExport}>
            Save
          </button>
          <button type="button" onClick={() => setShowDemoModal(true)}>
            Demo
          </button>
        </div>

        {showDemoModal && (
          <div className="demo-modal-overlay" onClick={() => setShowDemoModal(false)}>
            <div className="demo-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Example Datasets</h3>
              <ul className="demo-list">
                {demoEntries.map((demo) => (
                  <li key={demo.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onLoadDemo(demo);
                        setShowDemoModal(false);
                      }}
                    >
                      <strong>{demo.name}</strong>
                      <span>{demo.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="demo-modal-close" onClick={() => setShowDemoModal(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
import { useState, type ChangeEvent } from 'react';
import type { Person, ProjectData } from '../types/domain';
import { DemoModal } from './toolbar/DemoModal';
import { ReorderList } from './toolbar/ReorderList';
import { RootSelector } from './toolbar/RootSelector';
import { ViewControls } from './toolbar/ViewControls';

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
  onLoadDemo: (project: ProjectData) => void;
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
        <ViewControls
          visibleSpan={visibleSpan}
          curvature={curvature}
          spacing={spacing}
          onVisibleSpanChange={onVisibleSpanChange}
          onCurvatureChange={onCurvatureChange}
          onSpacingChange={onSpacingChange}
        />

        <RootSelector
          project={project}
          rootId={rootId}
          rootCentric={rootCentric}
          onRootChange={onRootChange}
          onRootCentricChange={onRootCentricChange}
        />

        <ReorderList orderedPeople={orderedPeople} onReorder={onReorder} onResetOrder={onResetOrder} />

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

        {showDemoModal && <DemoModal onClose={() => setShowDemoModal(false)} onLoadDemo={onLoadDemo} />}
      </div>
    </aside>
  );
}
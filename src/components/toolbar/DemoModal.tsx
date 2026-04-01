import { useState, useEffect } from 'react';
import { fetchDemoEntries, fetchDemoProject, type DemoEntry } from '../../data/demoProject';
import type { ProjectData } from '../../types/domain';

interface DemoModalProps {
  onClose: () => void;
  onLoadDemo: (project: ProjectData) => void;
}

export function DemoModal(props: DemoModalProps) {
  const { onClose, onLoadDemo } = props;
  const [entries, setEntries] = useState<DemoEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDemoEntries().then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="demo-modal-overlay" onClick={onClose}>
      <div className="demo-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Example Datasets</h3>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <ul className="demo-list">
            {entries.map((demo) => (
              <li key={demo.id}>
                <button
                  type="button"
                  onClick={async () => {
                    const project = await fetchDemoProject(demo);
                    onLoadDemo(project);
                    onClose();
                  }}
                >
                  <strong>{demo.name}</strong>
                  <span>{demo.description}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="demo-modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
import { demoEntries, type DemoEntry } from '../../data/demoProject';

interface DemoModalProps {
  onClose: () => void;
  onLoadDemo: (demo: DemoEntry) => void;
}

export function DemoModal(props: DemoModalProps) {
  const { onClose, onLoadDemo } = props;

  return (
    <div className="demo-modal-overlay" onClick={onClose}>
      <div className="demo-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Example Datasets</h3>
        <ul className="demo-list">
          {demoEntries.map((demo) => (
            <li key={demo.id}>
              <button
                type="button"
                onClick={() => {
                  onLoadDemo(demo);
                  onClose();
                }}
              >
                <strong>{demo.name}</strong>
                <span>{demo.description}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="demo-modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
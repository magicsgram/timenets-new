import type { Person } from '../../types/domain';

interface ReorderListProps {
  orderedPeople: Person[];
  onReorder: (ids: string[]) => void;
  onResetOrder: () => void;
}

export function ReorderList(props: ReorderListProps) {
  const { orderedPeople, onReorder, onResetOrder } = props;

  return (
    <div className="reorder-section">
      <div className="reorder-header">
        <span className="reorder-title">Lane order</span>
        <button type="button" className="reorder-reset" onClick={onResetOrder}>Auto</button>
      </div>
      <ol className="reorder-list">
        {orderedPeople.map((person, index) => {
          const moveUp = () => {
            if (index === 0) {
              return;
            }

            const ids = orderedPeople.map((entry) => entry.id);
            [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
            onReorder(ids);
          };

          const moveDown = () => {
            if (index === orderedPeople.length - 1) {
              return;
            }

            const ids = orderedPeople.map((entry) => entry.id);
            [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
            onReorder(ids);
          };

          return (
            <li key={person.id} className="reorder-item">
              <span className="reorder-name">{person.name}</span>
              <span className="reorder-buttons">
                <button type="button" disabled={index === 0} onClick={moveUp} aria-label="Move up">&#x25B2;</button>
                <button type="button" disabled={index === orderedPeople.length - 1} onClick={moveDown} aria-label="Move down">&#x25BC;</button>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
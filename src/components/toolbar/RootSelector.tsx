import type { ProjectData } from '../../types/domain';

interface RootSelectorProps {
  project: ProjectData;
  rootId: string;
  rootCentric: boolean;
  onRootChange: (rootId: string) => void;
  onRootCentricChange: (value: boolean) => void;
}

export function RootSelector(props: RootSelectorProps) {
  const { project, rootId, rootCentric, onRootChange, onRootCentricChange } = props;

  return (
    <label>
      Root
      <span className="root-centric-toggle">
        <input
          type="checkbox"
          checked={rootCentric}
          onChange={(event) => onRootCentricChange(event.target.checked)}
          className="root-centric-checkbox"
        />
        centric
      </span>
      <select value={rootId} onChange={(event) => onRootChange(event.target.value)}>
        {project.people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
    </label>
  );
}
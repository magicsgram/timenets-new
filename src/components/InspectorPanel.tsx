import { formatDate } from '../lib/dates';
import { getPersonName } from '../lib/family';
import type { Marriage, Person, ProjectData, TimelineEvent } from '../types/domain';

interface InspectorPanelProps {
  project: ProjectData;
  selectedPersonId: string;
  rootId: string;
  onSelectPerson: (personId: string) => void;
  onRootChange: (personId: string) => void;
  onUpdatePerson: (person: Person) => void;
  onUpdateMarriage: (marriage: Marriage) => void;
  onUpdateEvent: (event: TimelineEvent) => void;
}

function personSort(left: Person, right: Person): number {
  return getPersonName(left).localeCompare(getPersonName(right));
}

export function InspectorPanel(props: InspectorPanelProps) {
  const {
    project,
    selectedPersonId,
    rootId,
    onSelectPerson,
    onRootChange,
    onUpdatePerson,
    onUpdateMarriage,
    onUpdateEvent,
  } = props;

  const selectedPerson = project.people.find((person) => person.id === selectedPersonId) ?? project.people[0];
  const personMarriages = project.marriages.filter(
    (marriage) => marriage.person1Id === selectedPerson.id || marriage.person2Id === selectedPerson.id,
  );
  const personEvents = project.events.filter((event) => event.peopleIds.includes(selectedPerson.id));

  return (
    <aside className="inspector-panel">
      <section className="inspector-card people-list-card">
        <div className="section-heading">
          <p className="eyebrow">Navigator</p>
          <h2>People</h2>
        </div>
        <div className="person-list">
          {project.people.sort(personSort).map((person) => (
            <button
              key={person.id}
              type="button"
              className={`person-chip${person.id === selectedPerson.id ? ' is-active' : ''}${person.id === rootId ? ' is-root' : ''}`}
              onClick={() => onSelectPerson(person.id)}
            >
              <span>{getPersonName(person)}</span>
              <small>{person.id === rootId ? 'root' : person.sex}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="inspector-card">
        <div className="section-heading">
          <p className="eyebrow">Selected person</p>
          <h2>{getPersonName(selectedPerson)}</h2>
        </div>

        <div className="form-grid">
          <label>
            Name
            <input
              value={selectedPerson.name}
              onChange={(event) => onUpdatePerson({ ...selectedPerson, name: event.target.value })}
            />
          </label>
          <label>
            Sex
            <select
              value={selectedPerson.sex}
              onChange={(event) => onUpdatePerson({ ...selectedPerson, sex: event.target.value as Person['sex'] })}
            >
              <option value="F">Female</option>
              <option value="M">Male</option>
              <option value="U">Unknown</option>
            </select>
          </label>
          <label>
            Birth
            <input
              value={selectedPerson.birth?.value ?? ''}
              onChange={(event) =>
                onUpdatePerson({
                  ...selectedPerson,
                  birth: { ...selectedPerson.birth, value: event.target.value || undefined },
                })
              }
            />
          </label>
          <label>
            Death
            <input
              value={selectedPerson.death?.value ?? ''}
              onChange={(event) =>
                onUpdatePerson({
                  ...selectedPerson,
                  death: { ...selectedPerson.death, value: event.target.value || undefined },
                  deceased: Boolean(event.target.value),
                })
              }
            />
          </label>
          <label className="notes-field">
            Notes
            <textarea
              rows={4}
              value={selectedPerson.notes ?? ''}
              onChange={(event) => onUpdatePerson({ ...selectedPerson, notes: event.target.value })}
            />
          </label>
        </div>

        <button type="button" className="secondary-action" onClick={() => onRootChange(selectedPerson.id)}>
          Set as root person
        </button>
      </section>

      <section className="inspector-card">
        <div className="section-heading">
          <p className="eyebrow">Relationships</p>
          <h2>Marriages</h2>
        </div>

        <div className="entity-stack">
          {personMarriages.length === 0 ? <p className="muted">No marriage intervals recorded.</p> : null}
          {personMarriages.map((marriage) => (
            <label key={marriage.id}>
              {marriage.person1Id === selectedPerson.id
                ? getPersonName(project.people.find((person) => person.id === marriage.person2Id) ?? selectedPerson)
                : getPersonName(project.people.find((person) => person.id === marriage.person1Id) ?? selectedPerson)}
              <input
                value={marriage.start?.value ?? ''}
                onChange={(event) =>
                  onUpdateMarriage({
                    ...marriage,
                    start: { ...marriage.start, value: event.target.value || undefined },
                  })
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="inspector-card">
        <div className="section-heading">
          <p className="eyebrow">Events</p>
          <h2>Markers</h2>
        </div>

        <div className="entity-stack">
          {personEvents.length === 0 ? <p className="muted">No event markers linked to this person.</p> : null}
          {personEvents.map((eventRecord) => (
            <div key={eventRecord.id} className="event-editor">
              <label>
                Title
                <input
                  value={eventRecord.title}
                  onChange={(event) => onUpdateEvent({ ...eventRecord, title: event.target.value })}
                />
              </label>
              <label>
                Date
                <input
                  value={eventRecord.date?.value ?? ''}
                  onChange={(event) =>
                    onUpdateEvent({
                      ...eventRecord,
                      date: { ...eventRecord.date, value: event.target.value || undefined },
                    })
                  }
                />
              </label>
              <p className="muted">{formatDate(eventRecord.date)}</p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
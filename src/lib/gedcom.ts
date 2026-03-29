import { yearFromDate } from './dates';
import { buildFamilyIndex, getChildrenIds } from './family';
import type { Marriage, Person, ProjectData, TimelineEvent, UncertainDate } from '../types/domain';

interface GedcomLine {
  level: number;
  xref?: string;
  tag: string;
  value: string;
}

interface GedcomEventRecord {
  tag: string;
  date?: string;
  place?: string;
  type?: string;
  note?: string;
}

interface GedcomIndividualRecord {
  id: string;
  name?: string;
  sex?: Person['sex'];
  famcIds: string[];
  famsIds: string[];
  notes: string[];
  events: GedcomEventRecord[];
}

interface GedcomFamilyRecord {
  id: string;
  husbandId?: string;
  wifeId?: string;
  childIds: string[];
  notes: string[];
  events: GedcomEventRecord[];
}

const monthNumbers: Record<string, string> = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
};

const eventLabels: Record<string, string> = {
  BAPM: 'Baptism',
  CHR: 'Christening',
  DIV: 'Divorce',
  EDUC: 'Education',
  EMIG: 'Emigration',
  EVEN: 'Event',
  IMMI: 'Immigration',
  NATU: 'Naturalization',
  OCCU: 'Occupation',
  RESI: 'Residence',
};

function sanitizeXref(xref: string): string {
  return xref.replace(/^@|@$/g, '');
}

function parseGedcomLine(line: string): GedcomLine | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const match = /^(\d+)\s+(?:(@[^\s@]+@)\s+)?([A-Z0-9_]+)(?:\s+(.*))?$/.exec(trimmed);
  if (!match) {
    return null;
  }

  return {
    level: Number(match[1]),
    xref: match[2] ? sanitizeXref(match[2]) : undefined,
    tag: match[3],
    value: match[4]?.trim() ?? '',
  };
}

function parseName(rawName: string): Pick<Person, 'name'> {
  const cleaned = rawName.replace(/\s+/g, ' ').trim();
  const slashMatch = /^(.*?)\/(.*?)\/(.*)$/.exec(cleaned);
  if (slashMatch) {
    const given = `${slashMatch[1]} ${slashMatch[3]}`.replace(/\s+/g, ' ').trim();
    const surname = slashMatch[2].trim();
    return { name: [given, surname].filter(Boolean).join(' ') || 'Unknown' };
  }
  return { name: cleaned || 'Unknown' };
}

function parseGedcomDate(rawDate?: string): UncertainDate | undefined {
  if (!rawDate) {
    return undefined;
  }

  const normalized = rawDate.replace(/\s+/g, ' ').trim().toUpperCase();
  const uncertain = /\b(ABT|ABOUT|EST|ESTIMATED|CAL|CALCULATED|BEF|BEFORE|AFT|AFTER|BET|BETWEEN|FROM|TO)\b/.test(normalized);
  const dayMonthYear = /\b(\d{1,2})\s+([A-Z]{3,9})\s+(\d{3,4})\b/.exec(normalized);
  if (dayMonthYear) {
    const [, day, monthName, year] = dayMonthYear;
    const month = monthNumbers[monthName.slice(0, 3)];
    if (month) {
      return {
        value: `${year.padStart(4, '0')}-${month}-${day.padStart(2, '0')}`,
        uncertain,
      };
    }
  }

  const monthYear = /\b([A-Z]{3,9})\s+(\d{3,4})\b/.exec(normalized);
  if (monthYear) {
    const [, monthName, year] = monthYear;
    const month = monthNumbers[monthName.slice(0, 3)];
    if (month) {
      return {
        value: `${year.padStart(4, '0')}-${month}`,
        uncertain,
      };
    }
  }

  const yearMatch = /\b(\d{3,4})\b/.exec(normalized);
  if (yearMatch) {
    return {
      value: yearMatch[1].padStart(4, '0'),
      uncertain,
    };
  }

  return {
    value: normalized,
    uncertain: true,
  };
}

function chooseRootPersonId(project: Omit<ProjectData, 'rootPersonId'>): string {
  const withTemporaryRoot: ProjectData = {
    ...project,
    rootPersonId: project.people[0]?.id ?? 'root',
  };
  const familyIndex = buildFamilyIndex(withTemporaryRoot);

  const ranked = [...project.people].sort((left, right) => {
    const leftParents = Number(Boolean(left.fatherId)) + Number(Boolean(left.motherId));
    const rightParents = Number(Boolean(right.fatherId)) + Number(Boolean(right.motherId));
    const leftChildren = getChildrenIds(left.id, familyIndex).length;
    const rightChildren = getChildrenIds(right.id, familyIndex).length;
    const leftSpouses = familyIndex.marriagesByPersonId.get(left.id)?.length ?? 0;
    const rightSpouses = familyIndex.marriagesByPersonId.get(right.id)?.length ?? 0;
    const leftScore = leftParents * 3 + leftChildren * 4 + leftSpouses * 2;
    const rightScore = rightParents * 3 + rightChildren * 4 + rightSpouses * 2;

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return (yearFromDate(right.birth) ?? 0) - (yearFromDate(left.birth) ?? 0);
  });

  return ranked[0]?.id ?? project.people[0]?.id ?? 'root';
}

function pushNote(target: string[], note: string): void {
  if (!note) {
    return;
  }

  target.push(note.trim());
}

function buildEventTitle(event: GedcomEventRecord): string {
  if (event.type?.trim()) {
    return event.type.trim();
  }

  return eventLabels[event.tag] ?? event.tag;
}

export function parseGedcomProject(source: string, fileName = 'import.ged'): ProjectData {
  const individuals = new Map<string, GedcomIndividualRecord>();
  const families = new Map<string, GedcomFamilyRecord>();
  let currentIndividual: GedcomIndividualRecord | undefined;
  let currentFamily: GedcomFamilyRecord | undefined;
  let currentEvent: GedcomEventRecord | undefined;

  for (const rawLine of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = parseGedcomLine(rawLine);
    if (!line) {
      continue;
    }

    if (line.level === 0) {
      currentIndividual = undefined;
      currentFamily = undefined;
      currentEvent = undefined;

      if (line.tag === 'INDI' && line.xref) {
        currentIndividual = {
          id: line.xref,
          famcIds: [],
          famsIds: [],
          notes: [],
          events: [],
        };
        individuals.set(currentIndividual.id, currentIndividual);
      } else if (line.tag === 'FAM' && line.xref) {
        currentFamily = {
          id: line.xref,
          childIds: [],
          notes: [],
          events: [],
        };
        families.set(currentFamily.id, currentFamily);
      }

      continue;
    }

    if (line.level === 1) {
      currentEvent = undefined;

      if (currentIndividual) {
        switch (line.tag) {
          case 'NAME':
            currentIndividual.name = line.value;
            break;
          case 'SEX':
            currentIndividual.sex = line.value === 'F' ? 'F' : line.value === 'M' ? 'M' : 'U';
            break;
          case 'FAMC':
            currentIndividual.famcIds.push(sanitizeXref(line.value));
            break;
          case 'FAMS':
            currentIndividual.famsIds.push(sanitizeXref(line.value));
            break;
          case 'NOTE':
            pushNote(currentIndividual.notes, line.value);
            break;
          case 'BIRT':
          case 'DEAT':
          case 'BAPM':
          case 'CHR':
          case 'EDUC':
          case 'EMIG':
          case 'EVEN':
          case 'IMMI':
          case 'NATU':
          case 'OCCU':
          case 'RESI':
            currentEvent = { tag: line.tag };
            currentIndividual.events.push(currentEvent);
            break;
          default:
            break;
        }
      } else if (currentFamily) {
        switch (line.tag) {
          case 'HUSB':
            currentFamily.husbandId = sanitizeXref(line.value);
            break;
          case 'WIFE':
            currentFamily.wifeId = sanitizeXref(line.value);
            break;
          case 'CHIL':
            currentFamily.childIds.push(sanitizeXref(line.value));
            break;
          case 'NOTE':
            pushNote(currentFamily.notes, line.value);
            break;
          case 'DIV':
          case 'EVEN':
          case 'MARR':
            currentEvent = { tag: line.tag };
            currentFamily.events.push(currentEvent);
            break;
          default:
            break;
        }
      }

      continue;
    }

    if (line.level >= 2 && currentEvent) {
      if (line.tag === 'DATE') {
        currentEvent.date = line.value;
      } else if (line.tag === 'PLAC') {
        currentEvent.place = line.value;
      } else if (line.tag === 'TYPE') {
        currentEvent.type = line.value;
      } else if (line.tag === 'NOTE') {
        currentEvent.note = currentEvent.note ? `${currentEvent.note}\n${line.value}` : line.value;
      }
    }
  }

  const people: Person[] = Array.from(individuals.values()).map((record) => {
    const familyOfOrigin = record.famcIds.map((id) => families.get(id)).find(Boolean);
    const birthEvent = record.events.find((event) => event.tag === 'BIRT');
    const deathEvent = record.events.find((event) => event.tag === 'DEAT');
    const { name } = parseName(record.name ?? record.id);

    return {
      id: record.id,
      name,
      sex: record.sex ?? 'U',
      birth: parseGedcomDate(birthEvent?.date),
      death: parseGedcomDate(deathEvent?.date),
      deceased: Boolean(deathEvent?.date),
      fatherId: familyOfOrigin?.husbandId,
      motherId: familyOfOrigin?.wifeId,
      notes: record.notes.join('\n') || undefined,
    };
  });

  const marriages: Marriage[] = Array.from(families.values())
    .filter((family) => family.husbandId && family.wifeId)
    .map((family) => {
      const marriageEvent = family.events.find((event) => event.tag === 'MARR');
      const divorceEvent = family.events.find((event) => event.tag === 'DIV');
      return {
        id: family.id,
        person1Id: family.husbandId!,
        person2Id: family.wifeId!,
        start: parseGedcomDate(marriageEvent?.date),
        end: parseGedcomDate(divorceEvent?.date),
        divorced: Boolean(divorceEvent?.date),
        notes: family.notes.join('\n') || undefined,
      };
    });

  const events: TimelineEvent[] = [];

  for (const individual of individuals.values()) {
    const linkedPersonId = individual.id;
    for (const event of individual.events) {
      if (event.tag === 'BIRT' || event.tag === 'DEAT') {
        continue;
      }

      events.push({
        id: `${individual.id}-${event.tag}-${events.length}`,
        title: buildEventTitle(event),
        date: parseGedcomDate(event.date),
        peopleIds: [linkedPersonId],
        location: event.place,
        description: event.note,
      });
    }
  }

  for (const family of families.values()) {
    for (const event of family.events) {
      if (event.tag === 'MARR') {
        continue;
      }

      const peopleIds = [family.husbandId, family.wifeId, ...family.childIds].filter(
        (value): value is string => Boolean(value),
      );

      events.push({
        id: `${family.id}-${event.tag}-${events.length}`,
        title: buildEventTitle(event),
        date: parseGedcomDate(event.date),
        peopleIds,
        location: event.place,
        description: event.note,
      });
    }
  }

  const fileStem = fileName.replace(/\.[^.]+$/, '');
  const projectBase = {
    version: 1,
    meta: {
      id: fileStem.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'gedcom-import',
      name: fileStem || 'GEDCOM Import',
      description: 'Imported from GEDCOM into the offline TimeNets JSON schema.',
    },
    people,
    marriages,
    events,
  };

  return {
    ...projectBase,
    rootPersonId: chooseRootPersonId(projectBase),
  };
}
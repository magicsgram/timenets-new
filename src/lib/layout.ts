import { yearFromDate } from './dates';
import {
  buildFamilyIndex,
  getSpouseIds,
} from './family';
import type {
  LayoutEvent,
  LayoutMarriage,
  LayoutPerson,
  ProjectData,
  RepresentationMode,
  TimelineLayout,
  VisibleRange,
} from '../types/domain';

interface LayoutComputationContext {
  project: ProjectData;
  index: ReturnType<typeof buildFamilyIndex>;
  peopleById: Map<string, ProjectData['people'][number]>;
  currentYear: number;
}

function resolveGeneration(rootId: string, includedIds: Set<string>, context: LayoutComputationContext): Map<string, number> {
  const { project, index, peopleById } = context;
  const generation = new Map<string, number>([[rootId, 0]]);
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    const person = peopleById.get(currentId);
    if (!person) {
      continue;
    }

    const currentGeneration = generation.get(currentId) ?? 0;
    const candidates = [
      [person.fatherId, currentGeneration - 1],
      [person.motherId, currentGeneration - 1],
    ] as const;

    for (const [candidateId, candidateGeneration] of candidates) {
      if (!candidateId || !includedIds.has(candidateId) || generation.has(candidateId)) {
        continue;
      }

      generation.set(candidateId, candidateGeneration);
      queue.push(candidateId);
    }

    for (const child of project.people) {
      if ((child.fatherId === currentId || child.motherId === currentId) && includedIds.has(child.id) && !generation.has(child.id)) {
        generation.set(child.id, currentGeneration + 1);
        queue.push(child.id);
      }
    }
  }

  for (const person of project.people) {
    if (!includedIds.has(person.id) || generation.has(person.id)) {
      continue;
    }

    const spouseGeneration = getSpouseIds(person.id, index)
      .map((spouseId) => generation.get(spouseId))
      .find((value) => value !== undefined);

    generation.set(person.id, spouseGeneration ?? 0);
  }

  return generation;
}

function getPersonSpan(person: ProjectData['people'][number], currentYear: number): VisibleRange {
  const birthYear = yearFromDate(person.birth);
  const deathYear = yearFromDate(person.death);
  const startYear = birthYear ?? currentYear - 8;
  const age = birthYear ? currentYear - birthYear : 0;
  const likelyLongDead = !deathYear && !person.deceased && age >= 150;
  const isAlive = !deathYear && !person.deceased && !likelyLongDead;
  const endYear = deathYear ?? (person.deceased ? (birthYear ?? currentYear) + 80 : (likelyLongDead ? currentYear - 20 : (isAlive ? currentYear + 5 : currentYear)));

  return {
    startYear,
    endYear: Math.max(endYear, startYear + 1),
  };
}

export function createTimelineLayout(options: {
  project: ProjectData;
  rootId: string;
  mode: RepresentationMode;
  focusId: string;
  visibleRange?: VisibleRange;
  customOrder?: string[];
}): TimelineLayout {
  const { project, rootId, visibleRange, customOrder } = options;
  const index = buildFamilyIndex(project);
  const peopleById = new Map(project.people.map((person) => [person.id, person]));
  const currentYear = new Date().getFullYear();
  const context: LayoutComputationContext = {
    project,
    index,
    peopleById,
    currentYear,
  };
  const includedIds = new Set(project.people.map((p) => p.id));
  const generations = resolveGeneration(rootId, includedIds, context);
  const orderedIds = customOrder && customOrder.length > 0
    ? customOrder.filter((id) => includedIds.has(id))
    : project.people.map((p) => p.id).filter((id) => includedIds.has(id));

  const people = orderedIds
    .map((id) => peopleById.get(id))
    .filter((person): person is ProjectData['people'][number] => Boolean(person));

  const layoutPeople: LayoutPerson[] = people.map((person, lane) => {
    const personSpan = getPersonSpan(person, currentYear);
    const emphasis = 1;

    return {
      person,
      generation: generations.get(person.id) ?? 0,
      lane,
      emphasis,
      startYear: personSpan.startYear,
      endYear: personSpan.endYear,
    };
  });

  const laneByPersonId = new Map(layoutPeople.map((entry) => [entry.person.id, entry.lane]));

  const marriageEntries: LayoutMarriage[] = project.marriages
    .filter((marriage) => includedIds.has(marriage.person1Id) && includedIds.has(marriage.person2Id))
    .map((marriage) => ({
      marriage,
      laneA: laneByPersonId.get(marriage.person1Id) ?? 0,
      laneB: laneByPersonId.get(marriage.person2Id) ?? 0,
      year: yearFromDate(marriage.start) ?? currentYear,
    }));

  const eventEntries: LayoutEvent[] = project.events.flatMap((event) => {
    const eventYear = yearFromDate(event.date);
    if (!eventYear) {
      return [];
    }

    return event.peopleIds
      .filter((personId) => includedIds.has(personId))
      .map((personId) => ({
        event,
        lane: laneByPersonId.get(personId) ?? 0,
        year: eventYear,
      }));
  });

  const minYear = Math.min(...layoutPeople.map((entry) => entry.startYear), ...eventEntries.map((entry) => entry.year));
  const maxYear = Math.min(
    Math.max(...layoutPeople.map((entry) => entry.endYear), ...eventEntries.map((entry) => entry.year), currentYear),
    currentYear,
  );
  const dataRange = { startYear: minYear - 2, endYear: maxYear + 2 };
  const computedRange = visibleRange ?? dataRange;

  return {
    people: layoutPeople,
    marriages: marriageEntries,
    events: eventEntries,
    range: computedRange,
    dataRange,
  };
}
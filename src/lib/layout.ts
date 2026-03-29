import { yearFromDate } from './dates';
import {
  buildFamilyIndex,
  getChildrenIds,
  getIncludedIds,
  getPersonName,
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

function comparePersonIds(leftId: string, rightId: string, context: LayoutComputationContext): number {
  const { peopleById, currentYear } = context;
  const left = peopleById.get(leftId);
  const right = peopleById.get(rightId);
  if (!left || !right) {
    return leftId.localeCompare(rightId);
  }

  const birthDelta = (yearFromDate(left.birth) ?? currentYear) - (yearFromDate(right.birth) ?? currentYear);
  if (birthDelta !== 0) {
    return birthDelta;
  }

  return getPersonName(left).localeCompare(getPersonName(right));
}

function compareSpouses(personId: string, leftId: string, rightId: string, context: LayoutComputationContext): number {
  const { index, currentYear } = context;
  const marriages = index.marriagesByPersonId.get(personId) ?? [];
  const leftMarriage = marriages.find((marriage) => marriage.person1Id === leftId || marriage.person2Id === leftId);
  const rightMarriage = marriages.find((marriage) => marriage.person1Id === rightId || marriage.person2Id === rightId);
  const leftStart = yearFromDate(leftMarriage?.start) ?? currentYear;
  const rightStart = yearFromDate(rightMarriage?.start) ?? currentYear;

  if (leftStart !== rightStart) {
    return leftStart - rightStart;
  }

  return comparePersonIds(leftId, rightId, context);
}

function getSortedChildrenIds(personId: string, context: LayoutComputationContext): string[] {
  const { index } = context;
  return [...getChildrenIds(personId, index)].sort((left, right) => comparePersonIds(right, left, context));
}

function getSortedSpouseIds(personId: string, context: LayoutComputationContext): string[] {
  const { index } = context;
  return [...getSpouseIds(personId, index)].sort((left, right) => compareSpouses(personId, left, right, context));
}

function buildAncestorOrder(
  personId: string,
  includedIds: Set<string>,
  placed: Set<string>,
  context: LayoutComputationContext,
): string[] {
  const person = context.peopleById.get(personId);
  if (!person) {
    return [];
  }

  const result: string[] = [];
  const parentIds = [person.motherId, person.fatherId].filter((value): value is string => {
    if (!value) {
      return false;
    }

    return includedIds.has(value);
  });

  for (const parentId of parentIds) {
    result.push(...buildAncestorOrder(parentId, includedIds, placed, context));
    if (!placed.has(parentId)) {
      placed.add(parentId);
      result.push(parentId);
    }

    for (const spouseId of getSortedSpouseIds(parentId, context)) {
      if (!includedIds.has(spouseId) || spouseId === person.fatherId || spouseId === person.motherId || placed.has(spouseId)) {
        continue;
      }

      placed.add(spouseId);
      result.push(spouseId);
    }
  }

  return result;
}

function buildDescendantOrder(
  personId: string,
  includedIds: Set<string>,
  placed: Set<string>,
  context: LayoutComputationContext,
): string[] {
  const { peopleById } = context;
  const result: string[] = [];
  const sortedSpouses = getSortedSpouseIds(personId, context).filter((spouseId) => includedIds.has(spouseId));

  // Place all spouses adjacent to the focus person (AS: spouses in same block)
  for (const spouseId of sortedSpouses) {
    if (!placed.has(spouseId)) {
      placed.add(spouseId);
      result.push(spouseId);
    }
  }

  // Then place children below, grouped by spouse
  const handledChildren = new Set<string>();

  for (const spouseId of sortedSpouses) {
    const sharedChildren = getSortedChildrenIds(personId, context).filter((childId) => {
      const child = peopleById.get(childId);
      if (!child) {
        return false;
      }

      const matchesPair = (child.fatherId === personId && child.motherId === spouseId)
        || (child.motherId === personId && child.fatherId === spouseId);
      return matchesPair && includedIds.has(childId);
    });

    for (const childId of sharedChildren) {
      handledChildren.add(childId);
      if (!placed.has(childId)) {
        placed.add(childId);
        result.push(childId);
      }
      result.push(...buildDescendantOrder(childId, includedIds, placed, context));
    }
  }

  for (const childId of getSortedChildrenIds(personId, context)) {
    if (!includedIds.has(childId) || handledChildren.has(childId)) {
      continue;
    }

    if (!placed.has(childId)) {
      placed.add(childId);
      result.push(childId);
    }
    result.push(...buildDescendantOrder(childId, includedIds, placed, context));
  }

  return result;
}

function buildOrderedPeople(
  rootId: string,
  mode: RepresentationMode,
  includedIds: Set<string>,
  context: LayoutComputationContext,
): string[] {
  const placed = new Set<string>();
  const orderedIds: string[] = [];

  if (mode === 'hourglass' || mode === 'pedigree') {
    orderedIds.push(...buildAncestorOrder(rootId, includedIds, placed, context));
  }

  if (!placed.has(rootId)) {
    placed.add(rootId);
    orderedIds.push(rootId);
  }

  orderedIds.push(...buildDescendantOrder(rootId, includedIds, placed, context));

  const generations = resolveGeneration(rootId, includedIds, context);
  const leftovers = Array.from(includedIds).filter((id) => !placed.has(id));
  leftovers.sort((left, right) => {
    const generationDelta = (generations.get(left) ?? 0) - (generations.get(right) ?? 0);
    if (generationDelta !== 0) {
      return generationDelta;
    }

    return comparePersonIds(left, right, context);
  });

  orderedIds.push(...leftovers);
  return orderedIds;
}

export function createTimelineLayout(options: {
  project: ProjectData;
  rootId: string;
  mode: RepresentationMode;
  focusId: string;
  visibleRange?: VisibleRange;
  customOrder?: string[];
}): TimelineLayout {
  const { project, rootId, mode, visibleRange, customOrder } = options;
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
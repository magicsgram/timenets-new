import { clamp, yearFromDate } from './dates';
import {
  buildFamilyIndex,
  getChildrenIds,
  getIncludedIds,
  getKinshipDistances,
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

function resolveGeneration(rootId: string, includedIds: Set<string>, project: ProjectData): Map<string, number> {
  const byId = new Map(project.people.map((person) => [person.id, person]));
  const generation = new Map<string, number>([[rootId, 0]]);
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    const person = byId.get(currentId);
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

  const index = buildFamilyIndex(project);

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

function comparePersonIds(leftId: string, rightId: string, project: ProjectData, currentYear: number): number {
  const byId = new Map(project.people.map((person) => [person.id, person]));
  const left = byId.get(leftId);
  const right = byId.get(rightId);
  if (!left || !right) {
    return leftId.localeCompare(rightId);
  }

  const birthDelta = (yearFromDate(left.birth) ?? currentYear) - (yearFromDate(right.birth) ?? currentYear);
  if (birthDelta !== 0) {
    return birthDelta;
  }

  return getPersonName(left).localeCompare(getPersonName(right));
}

function compareSpouses(personId: string, leftId: string, rightId: string, project: ProjectData, currentYear: number): number {
  const index = buildFamilyIndex(project);
  const marriages = index.marriagesByPersonId.get(personId) ?? [];
  const leftMarriage = marriages.find((marriage) => marriage.person1Id === leftId || marriage.person2Id === leftId);
  const rightMarriage = marriages.find((marriage) => marriage.person1Id === rightId || marriage.person2Id === rightId);
  const leftStart = yearFromDate(leftMarriage?.start) ?? currentYear;
  const rightStart = yearFromDate(rightMarriage?.start) ?? currentYear;

  if (leftStart !== rightStart) {
    return leftStart - rightStart;
  }

  return comparePersonIds(leftId, rightId, project, currentYear);
}

function getSortedChildrenIds(personId: string, project: ProjectData): string[] {
  const index = buildFamilyIndex(project);
  const currentYear = new Date().getFullYear();
  return [...getChildrenIds(personId, index)].sort((left, right) => comparePersonIds(right, left, project, currentYear));
}

function getSortedSpouseIds(personId: string, project: ProjectData): string[] {
  const index = buildFamilyIndex(project);
  const currentYear = new Date().getFullYear();
  return [...getSpouseIds(personId, index)].sort((left, right) => compareSpouses(personId, left, right, project, currentYear));
}

function buildAncestorOrder(
  personId: string,
  project: ProjectData,
  includedIds: Set<string>,
  placed: Set<string>,
): string[] {
  const byId = new Map(project.people.map((person) => [person.id, person]));
  const person = byId.get(personId);
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
    result.push(...buildAncestorOrder(parentId, project, includedIds, placed));
    if (!placed.has(parentId)) {
      placed.add(parentId);
      result.push(parentId);
    }

    for (const spouseId of getSortedSpouseIds(parentId, project)) {
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
  project: ProjectData,
  includedIds: Set<string>,
  placed: Set<string>,
): string[] {
  const byId = new Map(project.people.map((person) => [person.id, person]));
  const result: string[] = [];
  const sortedSpouses = getSortedSpouseIds(personId, project).filter((spouseId) => includedIds.has(spouseId));

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
    const sharedChildren = getSortedChildrenIds(personId, project).filter((childId) => {
      const child = byId.get(childId);
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
      result.push(...buildDescendantOrder(childId, project, includedIds, placed));
    }
  }

  for (const childId of getSortedChildrenIds(personId, project)) {
    if (!includedIds.has(childId) || handledChildren.has(childId)) {
      continue;
    }

    if (!placed.has(childId)) {
      placed.add(childId);
      result.push(childId);
    }
    result.push(...buildDescendantOrder(childId, project, includedIds, placed));
  }

  return result;
}

function buildOrderedPeople(rootId: string, mode: RepresentationMode, project: ProjectData, includedIds: Set<string>): string[] {
  const placed = new Set<string>();
  const orderedIds: string[] = [];

  if (mode === 'hourglass' || mode === 'pedigree') {
    orderedIds.push(...buildAncestorOrder(rootId, project, includedIds, placed));
  }

  if (!placed.has(rootId)) {
    placed.add(rootId);
    orderedIds.push(rootId);
  }

  orderedIds.push(...buildDescendantOrder(rootId, project, includedIds, placed));

  const generations = resolveGeneration(rootId, includedIds, project);
  const currentYear = new Date().getFullYear();
  const leftovers = Array.from(includedIds).filter((id) => !placed.has(id));
  leftovers.sort((left, right) => {
    const generationDelta = (generations.get(left) ?? 0) - (generations.get(right) ?? 0);
    if (generationDelta !== 0) {
      return generationDelta;
    }

    return comparePersonIds(left, right, project, currentYear);
  });

  orderedIds.push(...leftovers);
  return orderedIds;
}

export function createTimelineLayout(options: {
  project: ProjectData;
  rootId: string;
  mode: RepresentationMode;
  focusId: string;
  doiRadius: number;
  visibleRange?: VisibleRange;
  customOrder?: string[];
}): TimelineLayout {
  const { project, rootId, mode, focusId, doiRadius, visibleRange, customOrder } = options;
  const index = buildFamilyIndex(project);
  const includedIds = getIncludedIds(rootId, mode, index);
  const generations = resolveGeneration(rootId, includedIds, project);
  const distances = getKinshipDistances(focusId, index);
  const currentYear = new Date().getFullYear();
  const orderedIds = customOrder && customOrder.length > 0
    ? customOrder.filter((id) => includedIds.has(id))
    : buildOrderedPeople(rootId, mode, project, includedIds);
  const peopleById = new Map(project.people.map((person) => [person.id, person]));

  const people = orderedIds
    .map((id) => peopleById.get(id))
    .filter((person): person is ProjectData['people'][number] => Boolean(person));

  const layoutPeople: LayoutPerson[] = people.map((person, lane) => {
    const personSpan = getPersonSpan(person, currentYear);
    const distance = distances.get(person.id);
    const emphasis = distance === undefined ? 0.16 : distance <= doiRadius ? 1 : clamp(0.82 - (distance - doiRadius) * 0.18, 0.18, 0.82);

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
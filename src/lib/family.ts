import type { Marriage, Person, ProjectData, RepresentationMode } from '../types/domain';

export interface FamilyIndex {
  byId: Map<string, Person>;
  childIdsByParentId: Map<string, string[]>;
  marriagesByPersonId: Map<string, Marriage[]>;
}

export function buildFamilyIndex(project: ProjectData): FamilyIndex {
  const byId = new Map(project.people.map((person) => [person.id, person]));
  const childIdsByParentId = new Map<string, string[]>();
  const marriagesByPersonId = new Map<string, Marriage[]>();

  for (const person of project.people) {
    for (const parentId of [person.fatherId, person.motherId]) {
      if (!parentId) {
        continue;
      }

      const children = childIdsByParentId.get(parentId) ?? [];
      children.push(person.id);
      childIdsByParentId.set(parentId, children);
    }
  }

  for (const marriage of project.marriages) {
    for (const personId of [marriage.person1Id, marriage.person2Id]) {
      const marriages = marriagesByPersonId.get(personId) ?? [];
      marriages.push(marriage);
      marriagesByPersonId.set(personId, marriages);
    }
  }

  return { byId, childIdsByParentId, marriagesByPersonId };
}

export function getPersonName(person: Person): string {
  return person.name || person.id;
}

export function getSpouseIds(personId: string, index: FamilyIndex): string[] {
  return (index.marriagesByPersonId.get(personId) ?? []).map((marriage) =>
    marriage.person1Id === personId ? marriage.person2Id : marriage.person1Id,
  );
}

export function getChildrenIds(personId: string, index: FamilyIndex): string[] {
  return index.childIdsByParentId.get(personId) ?? [];
}

export function getAncestorIds(rootId: string, index: FamilyIndex): Set<string> {
  const visited = new Set<string>();
  const stack = [rootId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId) {
      continue;
    }

    const current = index.byId.get(currentId);
    if (!current) {
      continue;
    }

    for (const parentId of [current.fatherId, current.motherId]) {
      if (!parentId || visited.has(parentId)) {
        continue;
      }

      visited.add(parentId);
      stack.push(parentId);
    }
  }

  return visited;
}

export function getDescendantIds(rootId: string, index: FamilyIndex): Set<string> {
  const visited = new Set<string>();
  const stack = [rootId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId) {
      continue;
    }

    const children = getChildrenIds(currentId, index);
    for (const childId of children) {
      if (visited.has(childId)) {
        continue;
      }

      visited.add(childId);
      stack.push(childId);
    }
  }

  return visited;
}

export function getIncludedIds(
  rootId: string,
  mode: RepresentationMode,
  index: FamilyIndex,
): Set<string> {
  const included = new Set<string>([rootId]);
  const ancestors = getAncestorIds(rootId, index);
  const descendants = getDescendantIds(rootId, index);

  if (mode === 'hourglass' || mode === 'pedigree') {
    ancestors.forEach((id) => included.add(id));
  }

  if (mode === 'hourglass' || mode === 'descendant') {
    descendants.forEach((id) => included.add(id));
  }

  // In hourglass mode, also include descendants of all ancestors (siblings, cousins, etc.)
  if (mode === 'hourglass') {
    for (const ancestorId of ancestors) {
      getDescendantIds(ancestorId, index).forEach((id) => included.add(id));
    }
  }

  for (const id of Array.from(included)) {
    getSpouseIds(id, index).forEach((spouseId) => included.add(spouseId));
  }

  return included;
}

export function getKinshipDistances(rootId: string, index: FamilyIndex): Map<string, number> {
  const distances = new Map<string, number>([[rootId, 0]]);
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    const current = index.byId.get(currentId);
    if (!current) {
      continue;
    }

    const currentDistance = distances.get(currentId) ?? 0;
    const relatedIds = new Set<string>([
      ...getChildrenIds(currentId, index),
      ...getSpouseIds(currentId, index),
      ...(current.fatherId ? [current.fatherId] : []),
      ...(current.motherId ? [current.motherId] : []),
    ]);

    for (const relatedId of relatedIds) {
      if (distances.has(relatedId)) {
        continue;
      }

      distances.set(relatedId, currentDistance + 1);
      queue.push(relatedId);
    }
  }

  return distances;
}
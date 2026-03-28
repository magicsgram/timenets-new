import { describe, expect, it } from 'vitest';
import { demoProject } from '../data/demoProject';
import { createTimelineLayout } from './layout';

describe('createTimelineLayout', () => {
  it('includes both ancestors and descendants in hourglass mode', () => {
    const layout = createTimelineLayout({
      project: demoProject,
      rootId: 'p6',
      mode: 'hourglass',
      focusId: 'p6',
      doiRadius: 2,
    });

    const ids = new Set(layout.people.map((entry) => entry.person.id));
    expect(ids.has('p1')).toBe(true);
    expect(ids.has('p8')).toBe(true);
    expect(ids.has('p7')).toBe(true);
  });

  it('places ancestors above the root and descendants below it', () => {
    const layout = createTimelineLayout({
      project: demoProject,
      rootId: 'p6',
      mode: 'hourglass',
      focusId: 'p6',
      doiRadius: 2,
    });

    const laneById = new Map(layout.people.map((entry) => [entry.person.id, entry.lane]));
    expect((laneById.get('p4') ?? 0) < (laneById.get('p6') ?? 0)).toBe(true);
    expect((laneById.get('p3') ?? 0) < (laneById.get('p6') ?? 0)).toBe(true);
    expect((laneById.get('p7') ?? 0) > (laneById.get('p6') ?? 0)).toBe(true);
    expect((laneById.get('p8') ?? 0) > (laneById.get('p7') ?? 0)).toBe(true);
  });

  it('limits pedigree mode to the ancestral side and spouses', () => {
    const layout = createTimelineLayout({
      project: demoProject,
      rootId: 'p6',
      mode: 'pedigree',
      focusId: 'p6',
      doiRadius: 2,
    });

    const ids = new Set(layout.people.map((entry) => entry.person.id));
    expect(ids.has('p8')).toBe(false);
    expect(ids.has('p4')).toBe(true);
    expect(ids.has('p7')).toBe(true);
  });
});
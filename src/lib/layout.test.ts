import { describe, expect, it } from 'vitest';
import { edithFinchDemo } from '../data/demoProject';
import { createTimelineLayout } from './layout';

describe('createTimelineLayout', () => {
  it('includes both ancestors and descendants in hourglass mode', () => {
    const layout = createTimelineLayout({
      project: edithFinchDemo,
      rootId: 'edith',
      mode: 'hourglass',
      focusId: 'edith',
    });

    const ids = new Set(layout.people.map((entry) => entry.person.id));
    expect(ids.has('odin')).toBe(true);
    expect(ids.has('dawn')).toBe(true);
    expect(ids.has('christopher')).toBe(true);
  });

  it('places ancestors above the root and descendants below it', () => {
    const layout = createTimelineLayout({
      project: edithFinchDemo,
      rootId: 'edith',
      mode: 'hourglass',
      focusId: 'edith',
    });

    const laneById = new Map(layout.people.map((entry) => [entry.person.id, entry.lane]));
    expect((laneById.get('dawn') ?? 0) < (laneById.get('edith') ?? 0)).toBe(true);
    expect((laneById.get('sanjay') ?? 0) < (laneById.get('edith') ?? 0)).toBe(true);
    expect((laneById.get('christopher') ?? 0) > (laneById.get('edith') ?? 0)).toBe(true);
  });

  it('includes all people regardless of mode', () => {
    const layout = createTimelineLayout({
      project: edithFinchDemo,
      rootId: 'edith',
      mode: 'pedigree',
      focusId: 'edith',
    });

    const ids = new Set(layout.people.map((entry) => entry.person.id));
    expect(ids.has('christopher')).toBe(true);
    expect(ids.has('dawn')).toBe(true);
    expect(ids.has('sanjay')).toBe(true);
  });

  it('applies custom order only to included people', () => {
    const layout = createTimelineLayout({
      project: edithFinchDemo,
      rootId: 'edith',
      mode: 'pedigree',
      focusId: 'edith',
      customOrder: ['christopher', 'edith', 'dawn', 'sanjay'],
    });

    expect(layout.people.map((entry) => entry.person.id)).toEqual(['christopher', 'edith', 'dawn', 'sanjay']);
  });
});
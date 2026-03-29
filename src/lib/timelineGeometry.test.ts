import { describe, expect, it } from 'vitest';
import { buildLifelinePoints, getPersonColor, interpolateLifeline } from './timelineGeometry';
import type { LayoutPerson, ProjectData } from '../types/domain';

const sampleProject: ProjectData = {
  version: 1,
  meta: { id: 'timeline-geometry', name: 'Timeline Geometry', description: '' },
  rootPersonId: 'p1',
  people: [
    { id: 'p1', name: 'Alex Gray', sex: 'M', birth: { value: '1980' } },
    { id: 'p2', name: 'Blair Gray', sex: 'F', birth: { value: '1982' } },
    { id: 'p3', name: 'Casey Hart', sex: 'F', birth: { value: '1984' } },
  ],
  marriages: [
    { id: 'm1', person1Id: 'p1', person2Id: 'p2', start: { value: '2000' } },
    { id: 'm2', person1Id: 'p1', person2Id: 'p3', start: { value: '2010' } },
  ],
  events: [],
};

const entry: LayoutPerson = {
  person: sampleProject.people[0],
  generation: 0,
  lane: 0,
  emphasis: 1,
  startYear: 1980,
  endYear: 2020,
};

describe('timelineGeometry', () => {
  it('infers the end of a prior marriage before the next marriage begins', () => {
    const points = buildLifelinePoints(
      entry,
      sampleProject,
      () => 10,
      2,
      new Map([
        ['m1:p1', 12],
        ['m2:p1', 16],
      ]),
    );

    expect(points.map((point) => point.type)).toEqual([
      'born',
      'dating',
      'marriage',
      'divorce',
      'resting',
      'dating',
      'marriage',
      'dead',
    ]);
    expect(points.find((point) => point.type === 'divorce')?.year).toBe(2009);
    expect(points[points.length - 1]?.y).toBe(16);
  });

  it('interpolates between lifeline points and exposes stable colors', () => {
    const points = [
      { type: 'born' as const, year: 1980, y: 10 },
      { type: 'dead' as const, year: 2000, y: 30 },
    ];

    expect(interpolateLifeline(points, 1990)).toBe(20);
    expect(getPersonColor('M')).toBe('#3d6ea8');
    expect(getPersonColor('F')).toBe('#a83d3d');
    expect(getPersonColor('U')).toBe('#555753');
  });
});
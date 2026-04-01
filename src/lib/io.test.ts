import { describe, expect, it } from 'vitest';
import type { ProjectData } from '../types/domain';
import { extractViewSettings, parseImportedProject, parseProjectJson, serializeProject } from './io';

const testProject: ProjectData = {
  version: 1,
  meta: { id: 'test', name: 'Test Project', description: '' },
  rootPersonId: 'alice',
  people: [
    { id: 'alice', name: 'Alice', sex: 'F', birth: { value: '1990-01-01' } },
    { id: 'bob', name: 'Bob', sex: 'M', birth: { value: '1988-05-10' } },
  ],
  marriages: [
    { id: 'm1', person1Id: 'alice', person2Id: 'bob', start: { value: '2015-06-01' } },
  ],
  events: [],
};

describe('project io', () => {
  it('round-trips project data through JSON serialization', () => {
    const serialized = serializeProject(testProject);
    const parsed = parseProjectJson(serialized);

    expect(parsed.meta.name).toBe(testProject.meta.name);
    expect(parsed.people).toHaveLength(testProject.people.length);
    expect(parsed.marriages[0]?.person1Id).toBe(testProject.marriages[0]?.person1Id);
  });

  it('preserves and extracts serialized view settings', () => {
    const serialized = serializeProject(testProject, {
      curvature: 2.5,
      spacing: 36,
      rootCentric: true,
      customOrder: ['alice', 'bob'],
      rootId: 'alice',
    });
    const parsed = JSON.parse(serialized) as unknown;

    expect(extractViewSettings(parsed)).toEqual({
      curvature: 2.5,
      spacing: 36,
      rootCentric: true,
      customOrder: ['alice', 'bob'],
      rootId: 'alice',
    });
  });

  it('routes JSON imports through project parsing', () => {
    const serialized = serializeProject(testProject);
    const imported = parseImportedProject(serialized, 'demo.json');

    expect(imported.meta.id).toBe(testProject.meta.id);
    expect(imported.rootPersonId).toBe(testProject.rootPersonId);
  });
});
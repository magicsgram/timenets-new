import { describe, expect, it } from 'vitest';
import { demoProject } from '../data/demoProject';
import { extractViewSettings, parseImportedProject, parseProjectJson, serializeProject } from './io';

describe('project io', () => {
  it('round-trips project data through JSON serialization', () => {
    const serialized = serializeProject(demoProject);
    const parsed = parseProjectJson(serialized);

    expect(parsed.meta.name).toBe(demoProject.meta.name);
    expect(parsed.people).toHaveLength(demoProject.people.length);
    expect(parsed.marriages[0]?.person1Id).toBe(demoProject.marriages[0]?.person1Id);
  });

  it('preserves and extracts serialized view settings', () => {
    const serialized = serializeProject(demoProject, {
      curvature: 2.5,
      spacing: 36,
      rootCentric: true,
      customOrder: ['charles', 'william'],
      rootId: 'charles',
    });
    const parsed = JSON.parse(serialized) as unknown;

    expect(extractViewSettings(parsed)).toEqual({
      curvature: 2.5,
      spacing: 36,
      rootCentric: true,
      customOrder: ['charles', 'william'],
      rootId: 'charles',
    });
  });

  it('routes JSON imports through project parsing', () => {
    const serialized = serializeProject(demoProject);
    const imported = parseImportedProject(serialized, 'demo.json');

    expect(imported.meta.id).toBe(demoProject.meta.id);
    expect(imported.rootPersonId).toBe(demoProject.rootPersonId);
  });
});
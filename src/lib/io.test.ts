import { describe, expect, it } from 'vitest';
import { demoProject } from '../data/demoProject';
import { parseProjectJson, serializeProject } from './io';

describe('project io', () => {
  it('round-trips project data through JSON serialization', () => {
    const serialized = serializeProject(demoProject);
    const parsed = parseProjectJson(serialized);

    expect(parsed.meta.name).toBe(demoProject.meta.name);
    expect(parsed.people).toHaveLength(demoProject.people.length);
    expect(parsed.marriages[0]?.person1Id).toBe(demoProject.marriages[0]?.person1Id);
  });
});
import type { ProjectData } from '../types/domain';

export const emptyProject: ProjectData = {
  version: 1,
  meta: { id: 'empty', name: 'New Project', description: '' },
  rootPersonId: '',
  people: [],
  marriages: [],
  events: [],
};

export interface DemoEntry {
  id: string;
  name: string;
  description: string;
  file: string;
}

export async function fetchDemoEntries(): Promise<DemoEntry[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}demo_data/index.json`);
  return res.json();
}

export async function fetchDemoProject(entry: DemoEntry): Promise<ProjectData> {
  const res = await fetch(`${import.meta.env.BASE_URL}demo_data/${entry.file}`);
  return res.json();
}

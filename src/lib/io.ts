import { parseGedcomProject } from './gedcom';
import type { ProjectData } from '../types/domain';

function assertProjectShape(value: unknown): asserts value is ProjectData {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Project file must contain a JSON object.');
  }

  const candidate = value as Partial<ProjectData>;
  if (!candidate.meta?.name || !Array.isArray(candidate.people) || !Array.isArray(candidate.marriages) || !Array.isArray(candidate.events)) {
    throw new Error('Project file is missing required TimeNets fields.');
  }
}

export function parseProjectJson(source: string): ProjectData {
  const parsed = JSON.parse(source) as unknown;
  assertProjectShape(parsed);
  return parsed;
}

export function parseImportedProject(source: string, fileName: string): ProjectData {
  const normalizedName = fileName.toLowerCase();
  if (normalizedName.endsWith('.ged') || normalizedName.endsWith('.gedcom')) {
    return parseGedcomProject(source, fileName);
  }

  return parseProjectJson(source);
}

export interface ViewSettings {
  curvature?: number;
  spacing?: number;
  rootCentric?: boolean;
  customOrder?: string[];
  rootId?: string;
}

export function serializeProject(project: ProjectData, viewSettings?: ViewSettings): string {
  const output = viewSettings ? { ...project, viewSettings } : project;
  return `${JSON.stringify(output, null, 2)}\n`;
}

export function extractViewSettings(source: unknown): ViewSettings | undefined {
  if (typeof source === 'object' && source !== null && 'viewSettings' in source) {
    return (source as { viewSettings: ViewSettings }).viewSettings;
  }
  return undefined;
}

export function downloadProject(project: ProjectData, viewSettings?: ViewSettings): void {
  const blob = new Blob([serializeProject(project, viewSettings)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.meta.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'timenets-project'}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
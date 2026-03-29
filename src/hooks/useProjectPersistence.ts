import { useEffect } from 'react';
import type { ProjectData } from '../types/domain';

export function useProjectPersistence(project: ProjectData, storageKey: string): void {
  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(project));
  }, [project, storageKey]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
}
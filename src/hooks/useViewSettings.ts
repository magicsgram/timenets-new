import { useMemo, useState } from 'react';
import type { ViewSettings } from '../lib/io';

export function useViewSettings() {
  const [curvature, setCurvature] = useState(2);
  const [spacing, setSpacing] = useState(28);
  const [rootCentric, setRootCentric] = useState(false);
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  const applyViewSettings = (settings: ViewSettings) => {
    if (settings.curvature !== undefined) {
      setCurvature(settings.curvature);
    }

    if (settings.spacing !== undefined) {
      setSpacing(settings.spacing);
    }

    if (settings.rootCentric !== undefined) {
      setRootCentric(settings.rootCentric);
    }

    if (settings.customOrder !== undefined) {
      setCustomOrder(settings.customOrder);
    }
  };

  const serializedViewSettings = useMemo<ViewSettings>(
    () => ({ curvature, spacing, rootCentric, customOrder }),
    [curvature, spacing, rootCentric, customOrder],
  );

  return {
    curvature,
    setCurvature,
    spacing,
    setSpacing,
    rootCentric,
    setRootCentric,
    customOrder,
    setCustomOrder,
    applyViewSettings,
    serializedViewSettings,
  };
}
import { useState } from "react";

import { Anatomy3DViewer } from "./Anatomy3DViewer";
import { AnatomyMap2D } from "./AnatomyMap2D";
import type { AnatomyMapProps } from "./anatomy-types";

export type { AnatomyMapProps, AnatomyRegionState } from "./anatomy-types";

export function AnatomyMap(props: AnatomyMapProps) {
  const [fallback, setFallback] = useState(false);

  if (fallback) {
    return <AnatomyMap2D {...props} />;
  }

  return <Anatomy3DViewer {...props} onFallback={() => setFallback(true)} />;
}

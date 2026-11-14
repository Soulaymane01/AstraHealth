import type { Status } from "@/lib/status";

export interface AnatomyRegionState {
  label: string;
  status: Status;
}

export interface AnatomyMapProps {
  regions: Record<string, AnatomyRegionState>;
  selectedDomain: string;
  onSelectDomain: (domain: string) => void;
  className?: string;
}

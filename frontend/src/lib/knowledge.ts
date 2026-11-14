export const DOMAIN_ARTICLE: Record<string, string> = {
  Cardiovascular: "hrv-basics",
  Musculoskeletal: "bone-loading",
  "Sleep & circadian": "sleep-circadian",
  Neurobehavioral: "isolation-confinement",
  "Metabolic & nutrition": "hydration-nutrition",
  "Immune & sensory": "immune-changes",
  General: "red-flags",
};

export function articleForDomain(domain: string): string | undefined {
  return DOMAIN_ARTICLE[domain];
}

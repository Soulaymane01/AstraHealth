/**
 * Demo mode hides developer-only affordances such as the design-system link.
 * It is on by default because this repository ships a seeded demonstration;
 * set VITE_DEMO_MODE=false to expose the styleguide while developing.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";

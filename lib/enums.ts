// T2: Single canonical source of truth for all enums — imported by client, server route, and Claude tool schema
export const CONTEXTS = ["@plane", "@computer", "@phone-calls", "@anywhere"] as const;
export type Context = (typeof CONTEXTS)[number];

export const PROJECTS = ["hopamine", "encando", "personal", "work", "expression", "other"] as const;
export type Project = (typeof PROJECTS)[number];

export const DEFAULT_CONTEXT: Context = "@anywhere";
export const DEFAULT_PROJECT: Project = "other";

export function isValidContext(v: string): v is Context {
  return (CONTEXTS as readonly string[]).includes(v);
}

export function isValidProject(v: string): v is Project {
  return (PROJECTS as readonly string[]).includes(v);
}

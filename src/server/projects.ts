import projects from "../../projects.json";

import type { Project } from "./types";

// Fonte única: projects.json, partilhado com os scripts do GitHub Actions.
export const PROJECTS: Project[] = projects;

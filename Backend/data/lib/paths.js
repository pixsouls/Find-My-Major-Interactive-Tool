// Canonical locations for everything the catalog pipeline reads and writes.
//
// Three tiers, and the distinction matters:
//   INPUT_DIR    - MSU exports. Read-only, never written to. (READ-ONLY DATA RULE)
//   MAPPING_DIR  - small human-owned files. Keyed on national standards only,
//                  so they survive a catalog re-export untouched.
//   GENERATED_DIR- rebuilt wholesale on every import. Safe to delete.

import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url)); // Backend/data/lib

export const DATA_DIR = path.join(here, '..'); // Backend/data
export const INPUT_DIR = DATA_DIR; // MSU exports currently sit directly in data/
export const MAPPING_DIR = path.join(DATA_DIR, 'mapping');
export const GENERATED_DIR = path.join(DATA_DIR, 'generated');
export const REPORTS_DIR = path.join(DATA_DIR, 'reports');

export const SOC_TO_CIP = path.join(MAPPING_DIR, 'socToCip.csv');
export const CIP_OVERRIDES = path.join(MAPPING_DIR, 'cipOverrides.csv');
export const DECISIONS = path.join(MAPPING_DIR, 'decisions.csv');
export const UNRESOLVED = path.join(MAPPING_DIR, 'unresolved.csv');

export const OUT_PROGRAMS = path.join(GENERATED_DIR, 'programs.json');
export const OUT_CAREER_MAJORS = path.join(GENERATED_DIR, 'careerMajors.json');

// Legacy inputs, used only by the one-time seed.
export const LEGACY_MAPPING = path.join(DATA_DIR, 'career_to_major_mapping.csv');
export const ADAPTED_CAREERS = path.join(DATA_DIR, 'adaptedCareers.json');

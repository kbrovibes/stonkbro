// Learn v2 — Case Studies track. One module per ticker, built entirely from
// the real chain-snapshot dataset in src/lib/learn/v2-data/.

import type { Module } from "@/lib/learn/curriculum";
import { DEFENSE_PLAYBOOK } from "./playbook";
import { PLTR_CASES } from "./pltr";
import { SOFI_CASES } from "./sofi";
import { NBIS_CASES } from "./nbis";
import { MRVL_CASES } from "./mrvl";
import { TSLA_CASES } from "./tsla";
import { TSM_CASES } from "./tsm";
import { ASTS_CASES } from "./asts";
import { SNDK_CASES } from "./sndk";
import { META_CASES } from "./meta";
import { RKLB_CASES } from "./rklb";
import { NVDA_CASES } from "./nvda";
import { AMD_CASES } from "./amd";
import { CRWD_CASES } from "./crwd";
import { HOOD_CASES } from "./hood";
import { IWM_CASES } from "./iwm";

// Traded universe first (matches the scanner's wheel tickers), then the
// "opportunities you weren't watching" — same order as v2-data/index.json.
export const CASE_STUDY_MODULES: Module[] = [
  // The shared rulebook every study's defense block applies — first on the track.
  DEFENSE_PLAYBOOK,
  PLTR_CASES,
  SOFI_CASES,
  NBIS_CASES,
  MRVL_CASES,
  TSLA_CASES,
  TSM_CASES,
  ASTS_CASES,
  SNDK_CASES,
  META_CASES,
  RKLB_CASES,
  NVDA_CASES,
  AMD_CASES,
  CRWD_CASES,
  HOOD_CASES,
  IWM_CASES,
];

import type { Strategy } from "../types";
import { condor } from "./condor";
import { dca } from "./dca";
import { dip } from "./dip";
import { momentum } from "./momentum";
import { pmcc } from "./pmcc";
import { putSeller, wheel } from "./puts";
import { rotation } from "./rotation";
import { shadow } from "./shadow";

export const STRATEGIES: Record<string, Strategy> = {
  "index-dca": dca,
  "sector-rotator": rotation,
  "megacap-momentum": momentum(),
  "margin-bull": momentum(),
  "dip-buyer": dip,
  "put-seller": putSeller,
  wheel,
  "pmcc-operator": pmcc,
  "spy-condor": condor,
  "growth-shadow": shadow,
};

export function strategyFor(profileId: string): Strategy | undefined {
  return STRATEGIES[profileId];
}

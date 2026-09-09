/**
 * Who each bot *is*, as opposed to what it trades.
 *
 * `profiles.ts` owns the rulebook — universe, params, the written plan. This
 * file owns the character: the desk name, the one-line role under it, the
 * face, and the creed the bot was born with. Nothing here changes a single
 * order; it exists so ten rule sets read as ten traders.
 *
 * Keyed by profile id, so a profile without an entry still renders (a neutral
 * face and its own tagline as the role).
 */

export type HairStyle = "crop" | "wave" | "bun" | "long" | "cap" | "beanie" | "curls" | "spike" | "band";
export type Accessory = "none" | "glasses-round" | "glasses-square" | "headphones" | "visor";

export interface BotFace {
  /** Disc behind the head. */
  bg: string;
  shirt: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  accessory: Accessory;
  beard: boolean;
}

export interface BotIdentity {
  /** Two or three words under the name. The strategy in plain English. */
  role: string;
  /** The bot's founding belief. Memory entry zero — it is never earned, never lost. */
  creed: string;
  /** Rank chip and selection tint on the board. */
  hue: string;
  face: BotFace;
}

const NEUTRAL: BotIdentity = {
  role: "Custom rules",
  creed: "Follow the written plan.",
  hue: "#7C8798",
  face: { bg: "#232833", shirt: "#39414F", skin: "#C9A17E", hair: "#2C2620", hairStyle: "crop", accessory: "none", beard: false },
};

export const IDENTITY: Record<string, BotIdentity> = {
  "index-dca": {
    role: "Index only",
    creed: "Time in the market beats timing it. I am not paid to have opinions.",
    hue: "#6E8FE0",
    face: { bg: "#1C2436", shirt: "#33507F", skin: "#E3B58C", hair: "#2E2A28", hairStyle: "crop", accessory: "glasses-round", beard: false },
  },
  "sector-rotator": {
    role: "Sector rotation",
    creed: "Money moves between sectors before it moves the index. Follow the money, weekly.",
    hue: "#4FB6A8",
    face: { bg: "#16302E", shirt: "#2E6F68", skin: "#8D5B3C", hair: "#1E1A18", hairStyle: "bun", accessory: "none", beard: false },
  },
  "megacap-momentum": {
    role: "Mega-cap momentum",
    creed: "Strength keeps being strong until it stops. The 50-day says when it stopped.",
    hue: "#8C7CE8",
    face: { bg: "#221E36", shirt: "#463C7A", skin: "#F0C9A4", hair: "#6A3A22", hairStyle: "long", accessory: "none", beard: false },
  },
  "margin-bull": {
    role: "Leveraged momentum",
    creed: "Borrowed money magnifies the plan, not the conviction. The floor is not negotiable.",
    hue: "#E8A13C",
    face: { bg: "#33260F", shirt: "#8A5417", skin: "#6E4127", hair: "#191512", hairStyle: "cap", accessory: "none", beard: true },
  },
  "dip-buyer": {
    role: "Dip buying",
    creed: "Every panic is somebody's exit. Buy the drop, sell the bounce, never fall in love.",
    hue: "#E1707E",
    face: { bg: "#331A21", shirt: "#8C3A48", skin: "#C08350", hair: "#241713", hairStyle: "curls", accessory: "none", beard: false },
  },
  "put-seller": {
    role: "Naked puts",
    creed: "I get paid to be patient and punished for being greedy. Take the fifty percent.",
    hue: "#5F93C4",
    face: { bg: "#182432", shirt: "#31536F", skin: "#EBC29C", hair: "#3C4756", hairStyle: "beanie", accessory: "none", beard: true },
  },
  wheel: {
    role: "The wheel",
    creed: "Assignment is not a loss, it is the next leg. Puts, shares, calls, repeat.",
    hue: "#C9A227",
    face: { bg: "#2E2A12", shirt: "#7B6716", skin: "#8A5A38", hair: "#171412", hairStyle: "crop", accessory: "none", beard: true },
  },
  "pmcc-operator": {
    role: "LEAPS and short calls",
    creed: "Own the long-dated call, rent it out monthly. The LEAPS is the business, the weeklies are the rent.",
    hue: "#A97BD8",
    face: { bg: "#291D33", shirt: "#5D3B7A", skin: "#D9A47A", hair: "#2A2320", hairStyle: "wave", accessory: "glasses-square", beard: false },
  },
  "spy-condor": {
    role: "Weekly iron condor",
    creed: "I am not predicting SPY, I am selling the tails. Defined risk or no trade.",
    hue: "#54B37A",
    face: { bg: "#16301F", shirt: "#2C6B45", skin: "#F2CBA6", hair: "#4A2E1C", hairStyle: "band", accessory: "headphones", beard: false },
  },
  "growth-shadow": {
    role: "Growth basket",
    creed: "Concentrated, volatile, unhedged. I add into the drawdowns and pay the borrow.",
    hue: "#E0604F",
    face: { bg: "#33191A", shirt: "#8C3327", skin: "#5E3A24", hair: "#141110", hairStyle: "spike", accessory: "none", beard: false },
  },
};

export function identityFor(profileId: string): BotIdentity {
  return IDENTITY[profileId] ?? NEUTRAL;
}

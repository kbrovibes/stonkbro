export type Sector = {
  slug: string;
  name: string;
  description: string;
  color: string;
  tickers: string[];
  catalysts: string[];
};

export const SECTORS: Sector[] = [
  {
    slug: "ai-infrastructure",
    name: "AI Infrastructure",
    description: "Companies building the compute, networking, and data infrastructure powering the AI revolution",
    color: "violet",
    tickers: ["NVDA", "AMD", "AVGO", "SMCI", "MRVL", "ARM", "TSM", "ANET", "CRDO", "VRT"],
    catalysts: ["Data center buildout", "GPU demand", "AI training compute scaling", "Edge AI deployment"],
  },
  {
    slug: "ai-software",
    name: "AI Software & Applications",
    description: "Companies building AI-powered software, platforms, and enterprise solutions",
    color: "sky",
    tickers: ["PLTR", "AI", "PATH", "SNOW", "MDB", "DDOG", "CRWD", "NET", "S", "CFLT"],
    catalysts: ["Enterprise AI adoption", "Government contracts", "AIP platform growth", "Cybersecurity AI"],
  },
  {
    slug: "quantum",
    name: "Quantum Computing",
    description: "Companies developing quantum hardware, software, and applications — high risk, massive upside",
    color: "indigo",
    tickers: ["IONQ", "RGTI", "QBTS", "QUBT", "ARQQ"],
    catalysts: ["Quantum advantage milestones", "Government funding", "Error correction breakthroughs", "Enterprise pilot programs"],
  },
  {
    slug: "nuclear-energy",
    name: "Nuclear & Clean Energy",
    description: "Nuclear power renaissance driven by AI data center energy demands and SMR technology",
    color: "emerald",
    tickers: ["OKLO", "SMR", "NNE", "LEU", "CCJ", "UEC", "UUUU", "DNN", "VST", "CEG"],
    catalysts: ["SMR deployments", "Data center power contracts", "Uranium supply squeeze", "DOE funding"],
  },
  {
    slug: "space-defense",
    name: "Space & Defense",
    description: "Commercial space, satellite internet, defense tech, and autonomous systems",
    color: "amber",
    tickers: ["RKLB", "ASTS", "LUNR", "RDW", "KTOS", "PLTR", "LHX", "AXON", "AEHR"],
    catalysts: ["Launch cadence increases", "Satellite constellation deployment", "Defense budget growth", "Space economy expansion"],
  },
  {
    slug: "fintech",
    name: "Fintech & Digital Finance",
    description: "Companies disrupting traditional finance — payments, lending, crypto, banking",
    color: "sky",
    tickers: ["SOFI", "AFRM", "COIN", "HOOD", "NU", "UPST", "MELI", "BILL", "TOST"],
    catalysts: ["Rate cuts benefiting growth fintech", "Crypto adoption cycles", "Embedded finance expansion", "Digital banking penetration"],
  },
  {
    slug: "biotech",
    name: "Biotech & Healthcare Innovation",
    description: "Gene therapy, GLP-1 drugs, AI-driven drug discovery, and medical devices",
    color: "rose",
    tickers: ["HIMS", "RXRX", "DNA", "VERV", "BEAM", "CRSP", "SDGR", "TEM", "GKOS"],
    catalysts: ["FDA approvals", "Clinical trial results", "GLP-1 market expansion", "AI drug discovery"],
  },
  {
    slug: "ev-autonomy",
    name: "EV & Autonomous Vehicles",
    description: "Electric vehicles, autonomous driving, battery tech, and charging infrastructure",
    color: "lime",
    tickers: ["TSLA", "RIVN", "LCID", "QS", "CHPT", "BLNK", "IONQ", "LAZR", "LIDR"],
    catalysts: ["Robotaxi deployment", "Battery breakthroughs", "Charging infrastructure buildout", "Autonomous driving regulation"],
  },
];

export function getSector(slug: string): Sector | undefined {
  return SECTORS.find((s) => s.slug === slug);
}

export function getAllSectorTickers(): string[] {
  const all = new Set<string>();
  for (const s of SECTORS) {
    for (const t of s.tickers) all.add(t);
  }
  return [...all];
}

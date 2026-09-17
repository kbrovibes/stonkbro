/**
 * SnapTrade API client for stonkbro server-side use.
 * - Positions: getUserAccountPositions (per-account; bulk /holdings is deprecated 410)
 * - Options:   OptionsApi.listOptionHoldings
 * - Transactions: AccountInformationApi.getAccountActivities (returns {data, pagination})
 */

import {
  Configuration,
  AccountInformationApi,
  AuthenticationApi,
  ConnectionsApi,
  OptionsApi,
} from "snaptrade-typescript-sdk";

const config = new Configuration({
  clientId: process.env.SNAPTRADE_CLIENT_ID!,
  consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
});

const accountApi = new AccountInformationApi(config);
const optApi = new OptionsApi(config);
const authApi = new AuthenticationApi(config);
const connApi = new ConnectionsApi(config);

const UID = process.env.SNAPTRADE_USER_ID!;
const USEC = process.env.SNAPTRADE_USER_SECRET!;

/**
 * A SnapTrade end-user identity. Every exported function below takes this
 * as an optional trailing parameter and falls back to the app's own
 * hardcoded UID/USEC when omitted — so every existing (owner) call site is
 * unchanged, and an approved user's own portfolio is reached only by
 * explicitly passing their own credentials in.
 */
export interface SnapTradeCreds {
  userId: string;
  userSecret: string;
}

function resolveCreds(creds?: SnapTradeCreds): SnapTradeCreds {
  return creds ?? { userId: UID, userSecret: USEC };
}

export interface Account {
  id: string;
  name: string;
  number: string;
  institution: string;
}

export interface Position {
  symbol: string;
  description: string;
  units: number;
  price: number;
  market_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  account_name: string;
  is_option: boolean;
}

export interface OptionPosition {
  underlying: string;
  option_type: string;
  strike: number;
  expiration: string;
  units: number;
  price: number;
  market_value: number;
  account_name: string;
  ticker: string;
}

export interface Balance {
  account_name: string;
  account_id: string;
  cash: number;
  buying_power: number;
  currency: string;
}

export interface PortfolioData {
  accounts: Account[];
  positions: Position[];
  options: OptionPosition[];
  balances: Balance[];
  summary: {
    total_market_value: number;
    total_cost_basis: number;
    unrealized_pnl: number;
    unrealized_pnl_pct: number;
    total_positions: number;
    total_options: number;
    cash: number;
  };
  fetched_at: string;
}

export interface BrokerageConnection {
  id: string;
  brokerage: string;
  slug: string;
  type: string; // "read" | "trade"
  disabled: boolean;
  created_date: string;
}

export async function listConnections(creds?: SnapTradeCreds): Promise<BrokerageConnection[]> {
  const { userId, userSecret } = resolveCreds(creds);
  const res = await connApi.listBrokerageAuthorizations({ userId, userSecret });
  return ((res.data as any[]) ?? []).map((c: any) => ({
    id: c.id ?? "",
    brokerage: c.brokerage?.display_name ?? c.brokerage?.name ?? c.name ?? "Unknown",
    slug: c.brokerage?.slug ?? "",
    type: c.type ?? "read",
    disabled: !!c.disabled,
    created_date: c.created_date ?? "",
  }));
}

/**
 * Returns a SnapTrade Connection Portal URL for the app's SnapTrade user.
 * The URL expires in 5 minutes. Opening it lets the user link a new
 * brokerage (e.g. Chase) to the same user, or fix a disabled connection
 * via `reconnect`. Accounts on the new connection flow into every existing
 * portfolio function automatically — they all iterate getAccounts().
 */
export async function getConnectPortalUrl(
  opts: { broker?: string; reconnect?: string } = {},
  creds?: SnapTradeCreds,
): Promise<string> {
  const { userId, userSecret } = resolveCreds(creds);
  const res = await authApi.loginSnapTradeUser({
    userId,
    userSecret,
    ...(opts.broker ? { broker: opts.broker } : {}),
    ...(opts.reconnect ? { reconnect: opts.reconnect } : {}),
    connectionType: "read",
    connectionPortalVersion: "v4",
  });
  const url = (res.data as any)?.redirectURI;
  if (!url) throw new Error("SnapTrade did not return a portal URL");
  return url;
}

/**
 * Registers a brand-new SnapTrade end-user for an approved app user. Uses
 * only the app-level clientId/consumerKey (not any existing end-user's
 * creds) — this is how a second, third, Nth real person gets their own
 * isolated SnapTrade identity to link their own brokerage against.
 */
export async function registerSnapTradeUser(appUserId: string): Promise<SnapTradeCreds> {
  const res = await authApi.registerSnapTradeUser({ userId: appUserId });
  const data = res.data as { userId?: string; userSecret?: string };
  if (!data.userId || !data.userSecret) {
    throw new Error("SnapTrade did not return a userId/userSecret pair");
  }
  return { userId: data.userId, userSecret: data.userSecret };
}

export async function getAccounts(creds?: SnapTradeCreds): Promise<Account[]> {
  const { userId, userSecret } = resolveCreds(creds);
  const res = await accountApi.listUserAccounts({ userId, userSecret });
  return ((res.data as any[]) ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    number: a.number,
    institution: a.institution_name ?? "Unknown",
  }));
}

export async function getPositions(accounts: Account[], creds?: SnapTradeCreds): Promise<Position[]> {
  const { userId, userSecret } = resolveCreds(creds);
  const all = await Promise.all(
    accounts.map(async (acct) => {
      const res = await accountApi.getUserAccountPositions({ userId, userSecret, accountId: acct.id });
      const positions = (res.data as any[]) ?? [];
      return positions.map((p: any): Position => {
        const sym: string = p.symbol?.symbol?.symbol ?? p.symbol?.ticker ?? "UNKNOWN";
        const desc: string = p.symbol?.symbol?.description ?? p.symbol?.description ?? "";
        const units = Number(p.units ?? 0);
        const price = Number(p.price ?? 0);
        const avg = Number(p.average_purchase_price ?? 0);
        const mv = price * units;
        const cost = avg * Math.abs(units);
        const pnl = mv - cost;
        const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
        return {
          symbol: sym,
          description: desc,
          units,
          price,
          market_value: mv,
          cost_basis: cost,
          unrealized_pnl: pnl,
          unrealized_pnl_pct: pnlPct,
          account_name: acct.name,
          is_option: false,
        };
      });
    })
  );
  return all.flat().sort((a, b) => b.market_value - a.market_value);
}

export async function getOptionPositions(accounts: Account[], creds?: SnapTradeCreds): Promise<OptionPosition[]> {
  const { userId, userSecret } = resolveCreds(creds);
  const all = await Promise.all(
    accounts.map(async (acct) => {
      const res = await optApi.listOptionHoldings({ userId, userSecret, accountId: acct.id });
      const opts = (res.data as any[]) ?? [];
      return opts.map((o: any): OptionPosition => {
        const sym = o.symbol?.option_symbol;
        const units = Number(o.units ?? 0);
        const price = Number(o.price ?? 0);
        const mv = price * units * 100;
        return {
          underlying: sym?.underlying_symbol?.symbol ?? "UNKNOWN",
          option_type: sym?.option_type ?? "UNKNOWN",
          strike: Number(sym?.strike_price ?? 0),
          expiration: sym?.expiration_date ?? "",
          units,
          price,
          market_value: mv,
          account_name: acct.name,
          ticker: sym?.ticker ?? "",
        };
      });
    })
  );
  return all.flat();
}

export async function getBalances(accounts: Account[], creds?: SnapTradeCreds): Promise<Balance[]> {
  const { userId, userSecret } = resolveCreds(creds);
  const all = await Promise.all(
    accounts.map(async (acct) => {
      const res = await accountApi.getUserAccountBalance({ userId, userSecret, accountId: acct.id });
      const bals = (res.data as any[]) ?? [];
      return bals.map((b: any): Balance => ({
        account_name: acct.name,
        account_id: acct.id,
        cash: Number(b.cash ?? 0),
        buying_power: Number(b.buying_power ?? 0),
        currency: b.currency?.code ?? "USD",
      }));
    })
  );
  return all.flat();
}

export async function getPortfolio(creds?: SnapTradeCreds): Promise<PortfolioData> {
  const accounts = await getAccounts(creds);
  const [positions, options, balances] = await Promise.all([
    getPositions(accounts, creds),
    getOptionPositions(accounts, creds),
    getBalances(accounts, creds),
  ]);

  const totalMV = positions.reduce((s, p) => s + p.market_value, 0);
  const totalCost = positions.reduce((s, p) => s + p.cost_basis, 0);
  const totalCash = balances.reduce((s, b) => s + b.cash, 0);

  return {
    accounts,
    positions,
    options,
    balances,
    summary: {
      total_market_value: totalMV,
      total_cost_basis: totalCost,
      unrealized_pnl: totalMV - totalCost,
      unrealized_pnl_pct: totalCost > 0 ? ((totalMV - totalCost) / totalCost) * 100 : 0,
      total_positions: positions.length,
      total_options: options.length,
      cash: totalCash,
    },
    fetched_at: new Date().toISOString(),
  };
}

export async function getTransactions(startDate = "2026-01-01", creds?: SnapTradeCreds) {
  const end = new Date().toISOString().split("T")[0];
  const start = startDate;
  const accounts = await getAccounts(creds);
  const { userId, userSecret } = resolveCreds(creds);
  const all = await Promise.all(
    accounts.map(async (acct) => {
      const res = await accountApi.getAccountActivities({
        userId,
        userSecret,
        accountId: acct.id,
        startDate: start,
        endDate: end,
      });
      // Returns { data: [...], pagination: {...} }
      return ((res.data as any)?.data ?? res.data ?? []) as any[];
    })
  );
  return all.flat();
}

/**
 * Returns the RAW activity feed across all accounts — no filtering for
 * options or anything else. Used by the Time Machine to reconstruct
 * historical positions.
 *
 * SnapTrade caps each `getAccountActivities` call at 1000 records. To get
 * complete history we split the date range whenever a single chunk returns
 * exactly 1000 (cap hit), recurse on each half, then dedupe by id.
 */
const ACTIVITIES_CAP = 1000;

// SnapTrade throttles the activities endpoint per-minute, far tighter than
// the rest of the API. Pace split-level calls to stay under it, and if the
// SDK still exhausts its own retries (~15s of backoff — shorter than the
// rate-limit window), wait out a full minute once before giving up.
const ACTIVITIES_CALL_SPACING_MS = 2600;
const RATE_LIMIT_WINDOW_WAIT_MS = 65_000;

/**
 * Optional cooperative-cancellation / progress hooks for long chain scans.
 * `checkCancelled` may throw to abort the scan; `progress` is best-effort.
 * Callers that don't pass hooks are completely unaffected.
 */
export interface ChainScanHooks {
  checkCancelled?: () => Promise<void>;
  progress?: (text: string) => Promise<void>;
}

async function fetchActivitiesWindow(
  accountId: string,
  startISO: string,
  endISO: string,
  depth = 0,
  hooks?: ChainScanHooks,
  creds?: SnapTradeCreds,
): Promise<any[]> {
  // Only poll the cancel flag near the top of the recursion tree — a DB
  // read per leaf window would be wasteful.
  if (depth <= 2) await hooks?.checkCancelled?.();
  if (depth > 0) await new Promise((r) => setTimeout(r, ACTIVITIES_CALL_SPACING_MS));
  const { userId, userSecret } = resolveCreds(creds);
  let res;
  try {
    res = await accountApi.getAccountActivities({
      userId, userSecret, accountId,
      startDate: startISO, endDate: endISO,
    });
  } catch (e) {
    if (!String(e).includes("429")) throw e;
    await new Promise((r) => setTimeout(r, RATE_LIMIT_WINDOW_WAIT_MS));
    res = await accountApi.getAccountActivities({
      userId, userSecret, accountId,
      startDate: startISO, endDate: endISO,
    });
  }
  const chunk = ((res.data as any)?.data ?? res.data ?? []) as any[];

  // Hit the cap → split unless the window is already a single day or we've recursed too deep.
  if (chunk.length >= ACTIVITIES_CAP && depth < 10) {
    const startDt = Date.parse(startISO);
    const endDt = Date.parse(endISO);
    if (endDt - startDt > 86400_000) {
      const midDt = new Date((startDt + endDt) / 2).toISOString().slice(0, 10);
      // Sequential on purpose — parallel halves compound into a request burst
      // that exceeds SnapTrade's per-minute rate limit once history is deep
      // enough to need several split levels (SDK gives up after 3 retries).
      const left = await fetchActivitiesWindow(accountId, startISO, midDt, depth + 1, hooks, creds);
      const right = await fetchActivitiesWindow(accountId, midDt, endISO, depth + 1, hooks, creds);
      // Dedupe by id (midpoint day may appear in both halves)
      const seen = new Set<string>();
      const out: any[] = [];
      for (const t of [...left, ...right]) {
        const id = t?.id;
        if (!id || !seen.has(id)) {
          if (id) seen.add(id);
          out.push(t);
        }
      }
      return out;
    }
  }
  return chunk;
}

/**
 * Full activity history with each activity tagged `_institution` — the Tax
 * Center's equity lot engine needs to keep FIFO lots separate per broker.
 */
export async function getAllActivitiesTagged(
  startDate = "2010-01-01",
  hooks?: ChainScanHooks,
  creds?: SnapTradeCreds,
): Promise<any[]> {
  const endDate = new Date().toISOString().slice(0, 10);
  const accounts = await getAccounts(creds);
  const all: any[] = [];
  for (const acct of accounts) {
    await hooks?.checkCancelled?.();
    await hooks?.progress?.(`${acct.institution}: fetching activity history…`);
    const txs = await fetchActivitiesWindow(acct.id, startDate, endDate, 0, hooks, creds);
    for (const t of txs) t._institution = acct.institution;
    all.push(...txs);
  }
  return all;
}

export async function getAllActivities(startDate = "2010-01-01", creds?: SnapTradeCreds): Promise<any[]> {
  const endDate = new Date().toISOString().slice(0, 10);
  const accounts = await getAccounts(creds);
  const all: any[] = [];
  for (const acct of accounts) {
    all.push(...(await fetchActivitiesWindow(acct.id, startDate, endDate, 0, undefined, creds)));
  }
  return all;
}

export interface OptionLeg {
  date: string;
  type: string;   // "BUY" | "SELL" | "OPTIONEXPIRATION" | "OPTIONASSIGNMENT"
  strike: number;
  expiry: string;
  units: number;  // signed: negative = short, positive = long
  price: number;
  amount: number; // positive = received, negative = paid
}

export interface ChainSplitLink {
  id: string;
  date: string;
  units: number;
}

export interface OptionChain {
  id: string; // stable within one scan — underlying+type+institution+first leg
  underlying: string;
  option_type: string;  // "CALL" | "PUT"
  institution?: string; // brokerage the contract lives at; absent on pre-v0.29 cached scans
  legs: OptionLeg[];
  net_pnl: number;
  status: "OPEN" | "CLOSED" | "EXPIRED" | "ASSIGNED";
  start_date: string;
  end_date: string | null;
  open_units: number;
  roll_count: number;
  close_month: string | null; // "YYYY-MM" of end_date, for monthly grouping
  direction: "SELL" | "BUY"; // first action — SELL = short/income, BUY = long/directional

  // A short position that gets PARTLY bought back, with the bought-back
  // quantity re-sold into a different strike/expiry the same trip, splits
  // into two chains rather than merging into one: the remaining quantity is
  // still this same contract's own story, and the rolled-off quantity starts
  // a new, independent lineage. (A close that zeroes the whole position
  // still merges into one chain, same as before — split is only for a
  // partial roll.) These fields are how the two halves stay linked.
  splitFrom: ChainSplitLink | null; // set on the child: which chain it split off from
  splitInto: ChainSplitLink[]; // set on the parent: which chains split off from it
  groupId: string; // shared by every chain descended from the same origin, via full rolls or splits
  groupStatus: "OPEN" | "CLOSED" | "EXPIRED" | "ASSIGNED"; // OPEN if any member of the group is still open
  groupNetPnl: number; // net_pnl summed across every chain in the group — "was the overall trade profitable"
}

export async function getOptionChains(
  startDate = "2026-01-01",
  hooks?: ChainScanHooks,
  creds?: SnapTradeCreds,
): Promise<OptionChain[]> {
  const end = new Date().toISOString().split("T")[0];
  const accounts = await getAccounts(creds);

  // SnapTrade caps each getAccountActivities call at 1000 records, so use the
  // recursive window-splitter to make sure no option transactions are dropped
  // (especially old LEAPS opens that would otherwise fall off the back of a
  // single overflowing page).
  // Sequential across accounts — parallel recursion trees each pace their own
  // calls but combined still burst SnapTrade's per-minute activities cap.
  const allRaw: any[][] = [];
  for (const acct of accounts) {
    await hooks?.checkCancelled?.();
    await hooks?.progress?.(`${acct.institution}: fetching activities…`);
    const txs = await fetchActivitiesWindow(acct.id, startDate, end, 0, hooks, creds);
    for (const t of txs) t._institution = acct.institution;
    allRaw.push(txs);
  }

  type ParsedTx = {
    date: string; type: string; underlying: string; option_type: string;
    strike: number; expiry: string; units: number; price: number; amount: number;
    institution: string;
  };

  const optionTxns: ParsedTx[] = allRaw.flat()
    .filter((t: any) => t.option_symbol != null)
    .map((t: any): ParsedTx => {
      const sym = t.option_symbol;
      return {
        date: t.trade_date ?? t.settlement_date ?? "",
        type: t.type ?? "",
        underlying: sym?.underlying_symbol?.symbol ?? "UNKNOWN",
        option_type: sym?.option_type ?? "UNKNOWN",
        strike: Number(sym?.strike_price ?? 0),
        expiry: sym?.expiration_date ?? "",
        units: Number(t.units ?? 0),
        price: Number(t.price ?? 0),
        amount: Number(t.amount ?? 0),
        institution: t._institution ?? "Unknown",
      };
    })
    // Sort by date; on ties, SELL/OPTIONEXPIRATION/OPTIONASSIGNMENT before BUY
    // so a same-day SELL→BUY-to-close chain doesn't get misclassified as BUY-first.
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      const rank = (t: string) => t === "BUY" ? 1 : 0;
      return rank(a.type) - rank(b.type);
    });

  // ── Step 1: per-contract chains (grouped by strike+expiry) ───────────────
  // Prevents mixing of simultaneous positions at different strikes/expiries.
  type ContractChain = {
    underlying: string; option_type: string; strike: number; expiry: string;
    institution: string;
    legs: OptionLeg[]; net_pnl: number;
    status: "OPEN" | "CLOSED" | "EXPIRED" | "ASSIGNED";
    start_date: string; end_date: string | null; open_units: number;
    first_action: string; // "BUY" or "SELL"
  };

  // Institution is part of the key so identical contracts held at two
  // brokerages stay separate, and roll pairing below never crosses brokers.
  const contractMap = new Map<string, ParsedTx[]>();
  for (const tx of optionTxns) {
    const key = `${tx.underlying}|${tx.option_type}|${tx.strike}|${tx.expiry}|${tx.institution}`;
    if (!contractMap.has(key)) contractMap.set(key, []);
    contractMap.get(key)!.push(tx);
  }

  const contractChains: ContractChain[] = [];

  for (const txns of contractMap.values()) {
    const { underlying, option_type, strike, expiry, institution } = txns[0];
    let runningUnits = 0;
    let currentLegs: OptionLeg[] = [];

    const flush = (status: ContractChain["status"]) => {
      if (!currentLegs.length) return;
      const firstAction = currentLegs.find(l => l.type === "BUY" || l.type === "SELL")?.type ?? "SELL";
      contractChains.push({
        underlying, option_type, strike, expiry, institution,
        legs: [...currentLegs],
        net_pnl: currentLegs.filter(l => l.type === "BUY" || l.type === "SELL").reduce((s, l) => s + l.amount, 0),
        status,
        start_date: currentLegs[0].date,
        end_date: status === "OPEN" ? null : currentLegs[currentLegs.length - 1].date,
        open_units: runningUnits,
        first_action: firstAction,
      });
      currentLegs = [];
    };

    for (const tx of txns) {
      const leg: OptionLeg = {
        date: tx.date, type: tx.type, strike: tx.strike, expiry: tx.expiry,
        units: tx.units, price: tx.price, amount: tx.amount,
      };
      currentLegs.push(leg);
      if (tx.type === "OPTIONEXPIRATION") { runningUnits = 0; flush("EXPIRED"); continue; }
      if (tx.type === "OPTIONASSIGNMENT") { runningUnits = 0; flush("ASSIGNED"); continue; }
      runningUnits += tx.units;
      if (runningUnits === 0) flush("CLOSED");
    }
    if (currentLegs.length > 0) flush("OPEN");
  }

  // Auto-expire contracts that SnapTrade never sent an OPTIONEXPIRATION for
  const today = new Date().toISOString().split("T")[0];
  for (const c of contractChains) {
    if (c.status === "OPEN" && c.expiry < today) {
      c.status = "EXPIRED";
      c.end_date = c.expiry;
      c.open_units = 0;
    }
  }

  // ── Step 2: group by underlying+type, pair rolls into lineage chains ─────
  // Only SELL-first (income/short) contracts participate in roll pairing.
  // BUY-first (long/directional) contracts remain standalone.
  //
  // A roll = BUY-to-close of one contract followed within ROLL_WINDOW_DAYS by
  // a SELL (new contract or add-on to an existing one) in the same
  // underlying+type. Each close pairs with at most one SELL event and each
  // SELL event is consumed by at most one close, so every contract has at
  // most one successor — lineages form disjoint trees, each containing
  // exactly one terminal contract (open, expired, assigned, or an unrolled
  // close). Expiration/assignment settles a chain; a new sell afterwards
  // starts a fresh chain. This keeps simultaneous positions at different
  // strikes in separate chains instead of braiding them together.
  const ROLL_WINDOW_DAYS = 3;
  // Chains spanning longer than this get their oldest contracts split off as
  // settled chains that count toward the month they closed in.
  const MAX_CHAIN_DAYS = 42;

  const displayGroups = new Map<string, ContractChain[]>();
  for (const c of contractChains) {
    const key = `${c.underlying}|${c.option_type}|${c.institution}`;
    if (!displayGroups.has(key)) displayGroups.set(key, []);
    displayGroups.get(key)!.push(c);
  }

  const result: OptionChain[] = [];
  const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

  // Populated inside buildChain below (every raw contract node → the final
  // chain it ended up part of), then used after the whole scan to turn the
  // split edges recorded per-group into id-based links between chains.
  const nodeToChain = new Map<ContractChain, OptionChain>();
  // Raw-contract split edges from the partial-roll detection below, keyed by
  // the contract whose partial close spawned the edge (one contract can
  // split more than once over its life, hence an array of targets).
  const splitNext = new Map<ContractChain, { to: ContractChain; date: string; units: number }[]>();

  const buildChain = (seq: ContractChain[], root: ContractChain): OptionChain => {
    // `seq` is sorted by start_date ascending (roll lineage order, oldest
    // contract first) and each contract's own `legs` array is already
    // chronological — built by walking the globally date-sorted
    // transactions one contract at a time. Concatenating in that order,
    // untouched, is what keeps a roll's story straight: the BUY that closes
    // the old contract lands before the SELL that opens its successor even
    // when both happen on the same date (SnapTrade gives day granularity,
    // not a timestamp, so same-day is the common case for a roll).
    //
    // Re-sorting this flattened list by date again — as this used to do,
    // with SELL/EXPIRATION/ASSIGNMENT ranked before BUY on a tie — reorders
    // exactly that boundary: a same-day close-then-reopen roll would render
    // as SELL, SELL, BUY instead of SELL, BUY, SELL, because the tie-break
    // was designed for a different case (disambiguating a single contract's
    // own same-day open+close, handled by the identical tie-break in the
    // transaction parse above, not for this cross-contract merge). Roll
    // pairing already guarantees a successor's sell event is never earlier
    // than its predecessor's close (`gap < 0` is rejected during pairing),
    // so no per-leg sort is needed here at all.
    const allLegs = seq.flatMap(c => c.legs);
    const net_pnl = seq.reduce((s, c) => s + c.net_pnl, 0);
    const end_date = root.end_date;
    const firstLeg = allLegs[0];
    const chain: OptionChain = {
      id: `${root.underlying}|${root.option_type}|${root.institution}|${firstLeg.date}|${firstLeg.strike}|${firstLeg.expiry}`,
      underlying: root.underlying,
      option_type: root.option_type,
      institution: root.institution,
      legs: allLegs,
      net_pnl,
      status: root.status,
      start_date: firstLeg.date,
      end_date,
      open_units: root.open_units,
      roll_count: seq.length - 1,
      close_month: end_date ? end_date.substring(0, 7) : null,
      direction: seq[0].first_action === "BUY" ? "BUY" : "SELL",
      // Filled in once every chain in the scan exists: split links need the
      // target chain's id, and group rollups need every member's net_pnl.
      splitFrom: null,
      splitInto: [],
      groupId: "",
      groupStatus: root.status,
      groupNetPnl: net_pnl,
    };
    for (const node of seq) nodeToChain.set(node, chain);
    return chain;
  };

  for (const contracts of displayGroups.values()) {
    const shorts = contracts.filter(c => c.first_action === "SELL");
    const longs  = contracts.filter(c => c.first_action !== "SELL");

    // Every SELL leg (initial open or add-on) is a potential roll target.
    type SellEvent = { node: ContractChain; date: string; units: number; consumed: boolean };
    const sellEvents: SellEvent[] = shorts.flatMap(c =>
      c.legs
        .filter(l => l.type === "SELL")
        .map(l => ({ node: c, date: l.date, units: Math.abs(l.units), consumed: false }))
    );

    // Pair each BUY-to-close with its most plausible roll target: nearest in
    // time, then matching contract count, then closest strike.
    const rollNext = new Map<ContractChain, ContractChain>();
    const closedShorts = shorts
      .filter(c => c.status === "CLOSED" && c.end_date)
      .sort((a, b) => a.end_date!.localeCompare(b.end_date!) || a.strike - b.strike);
    for (const c of closedShorts) {
      const soldUnits = c.legs.filter(l => l.type === "SELL").reduce((s, l) => s + Math.abs(l.units), 0);
      let best: SellEvent | null = null;
      let bestScore = Infinity;
      for (const ev of sellEvents) {
        if (ev.consumed || ev.node === c) continue;
        const gap = daysBetween(c.end_date!, ev.date);
        if (gap < 0 || gap > ROLL_WINDOW_DAYS) continue;
        const score = gap * 10000 + (ev.units === soldUnits ? 0 : 5000) + Math.abs(ev.node.strike - c.strike);
        if (score < bestScore) { bestScore = score; best = ev; }
      }
      if (best) { best.consumed = true; rollNext.set(c, best.node); }
    }

    // Partial rolls: a BUY that reduces a short's own running count without
    // zeroing it — e.g. buying back 2 of 5 short calls and re-selling those
    // 2 at a new strike/expiry the same trip, leaving 3 of the original
    // still open. Unlike a full close, the contract's own remaining
    // quantity keeps living in its own chain (it never actually closed), so
    // this can't merge into one chain the way a full roll does — instead it
    // links two independent chains together after the fact, via splitNext.
    // Runs after the full-roll pass above and only claims what that pass
    // left unconsumed, so a genuine full roll is never reinterpreted as a
    // partial one.
    for (const c of shorts) {
      let running = 0;
      for (const leg of c.legs) {
        if (leg.type === "OPTIONEXPIRATION" || leg.type === "OPTIONASSIGNMENT") { running = 0; continue; }
        running += leg.units;
        if (leg.type !== "BUY" || running === 0) continue;
        const units = Math.abs(leg.units);
        let best: SellEvent | null = null;
        let bestScore = Infinity;
        for (const ev of sellEvents) {
          if (ev.consumed || ev.node === c) continue;
          const gap = daysBetween(leg.date, ev.date);
          if (gap < 0 || gap > ROLL_WINDOW_DAYS) continue;
          const score = gap * 10000 + (ev.units === units ? 0 : 5000) + Math.abs(ev.node.strike - c.strike);
          if (score < bestScore) { bestScore = score; best = ev; }
        }
        if (best) {
          best.consumed = true;
          if (!splitNext.has(c)) splitNext.set(c, []);
          splitNext.get(c)!.push({ to: best.node, date: leg.date, units });
        }
      }
    }

    // Group contracts into lineage trees by following successors to the root.
    const rootOf = (c: ContractChain): ContractChain => {
      let cur = c;
      const seen = new Set<ContractChain>([cur]);
      while (rollNext.has(cur)) {
        const next = rollNext.get(cur)!;
        if (seen.has(next)) break;
        seen.add(next);
        cur = next;
      }
      return cur;
    };
    const trees = new Map<ContractChain, ContractChain[]>();
    for (const c of shorts) {
      const root = rootOf(c);
      if (!trees.has(root)) trees.set(root, []);
      trees.get(root)!.push(c);
    }

    for (const [root, nodes] of trees) {
      nodes.sort((a, b) => a.start_date.localeCompare(b.start_date));
      // Settle stale history: split off the oldest contracts until the
      // remaining chain spans ≤ MAX_CHAIN_DAYS, so a closed chain's realized
      // premium attributes to the month it actually closed in rather than
      // the month the position first opened, potentially years earlier.
      //
      // Only settled roots get this treatment. A still-OPEN root has no
      // end_date and so no close_month to attribute anything to — trimming
      // it doesn't serve that purpose, it only fragments a position that
      // has been continuously rolled (never gone flat) into a fake "closed"
      // chain plus a fake "new" open one. Open shows the full roll lineage
      // back to origin, however long it's been running; only a chain that
      // has actually settled gets bounded for monthly reporting.
      if (root.status !== "OPEN") {
        const chainEnd = root.end_date ?? today;
        while (
          nodes.length > 1 &&
          nodes[0] !== root &&
          daysBetween(nodes[0].start_date, chainEnd) > MAX_CHAIN_DAYS
        ) {
          const stale = nodes.shift()!;
          result.push(buildChain([stale], stale));
        }
      }
      result.push(buildChain(nodes, root));
    }

    for (const c of longs) result.push(buildChain([c], c));
  }

  // Every chain now exists, so raw-contract split edges can resolve to the
  // ids of the chains on either side.
  for (const [fromNode, edges] of splitNext) {
    const fromChain = nodeToChain.get(fromNode);
    if (!fromChain) continue;
    for (const edge of edges) {
      const toChain = nodeToChain.get(edge.to);
      if (!toChain || toChain === fromChain) continue;
      fromChain.splitInto.push({ id: toChain.id, date: edge.date, units: edge.units });
      toChain.splitFrom = { id: fromChain.id, date: edge.date, units: edge.units };
    }
  }

  // groupId = the id of the oldest ancestor reachable by walking splitFrom
  // links backward. Every chain descended from one origin — whether by a
  // full roll (already merged into a single chain) or a split (which isn't
  // merged) — ends up sharing one groupId.
  const chainById = new Map(result.map((c) => [c.id, c]));
  const groupIdOf = (chain: OptionChain): string => {
    let cur = chain;
    const seen = new Set<string>([cur.id]);
    while (cur.splitFrom) {
      const parent = chainById.get(cur.splitFrom.id);
      if (!parent || seen.has(parent.id)) break;
      seen.add(parent.id);
      cur = parent;
    }
    return cur.id;
  };
  for (const chain of result) chain.groupId = groupIdOf(chain);

  // Roll up status and P&L across every chain sharing a groupId — "is the
  // overall trade (across every split) still open, and was it profitable".
  const groups = new Map<string, OptionChain[]>();
  for (const chain of result) {
    if (!groups.has(chain.groupId)) groups.set(chain.groupId, []);
    groups.get(chain.groupId)!.push(chain);
  }
  for (const members of groups.values()) {
    if (members.length < 2) continue; // solo chains keep their own numbers, set above
    const groupNetPnl = members.reduce((s, m) => s + m.net_pnl, 0);
    const anyOpen = members.some((m) => m.status === "OPEN");
    const groupStatus: OptionChain["groupStatus"] = anyOpen
      ? "OPEN"
      : [...members].sort((a, b) => (b.end_date ?? "").localeCompare(a.end_date ?? ""))[0].status;
    for (const m of members) {
      m.groupNetPnl = groupNetPnl;
      m.groupStatus = groupStatus;
    }
  }

  return result.sort((a, b) => b.start_date.localeCompare(a.start_date));
}

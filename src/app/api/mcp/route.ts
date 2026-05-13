/**
 * HTTP MCP endpoint — exposes SnapTrade tools over HTTP so Claude Desktop
 * can connect to the deployed Vercel app instead of a local stdio server.
 *
 * Claude Desktop config (claude_desktop_config.json):
 *   "snaptrade-remote": {
 *     "url": "https://stonkbro-2.vercel.app/api/mcp",
 *     "headers": { "Authorization": "Bearer <CRON_SECRET>" }
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { getPortfolio, getAccounts, getTransactions } from "@/lib/snaptrade/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BEARER = process.env.CRON_SECRET;

const TOOLS = [
  { name: "list_accounts", description: "List connected brokerage accounts (e.g. Fidelity). Returns account names, IDs, and institutions.", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "get_portfolio_summary", description: "High-level portfolio summary: total value, cost basis, unrealized P&L, and top 10 holdings by weight.", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "get_holdings", description: "All positions with price, market value, cost basis, and unrealized P&L.", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "get_balances", description: "Cash balances and buying power per account.", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "get_transactions", description: "Transaction history (buys, sells, dividends).", inputSchema: { type: "object", properties: { days: { type: "number", description: "Lookback days (default 90)" } }, required: [] } },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "list_accounts": {
      const accounts = await getAccounts();
      return JSON.stringify({ accounts }, null, 2);
    }
    case "get_portfolio_summary": {
      const p = await getPortfolio();
      return JSON.stringify({
        summary: p.summary,
        top_holdings: p.positions.slice(0, 10).map((pos) => ({
          symbol: pos.symbol,
          market_value: `$${pos.market_value.toFixed(2)}`,
          weight_pct: p.summary.total_market_value > 0
            ? `${((pos.market_value / p.summary.total_market_value) * 100).toFixed(1)}%`
            : "0%",
          unrealized_pnl: `$${pos.unrealized_pnl.toFixed(2)}`,
          unrealized_pnl_pct: `${pos.unrealized_pnl_pct.toFixed(2)}%`,
        })),
      }, null, 2);
    }
    case "get_holdings": {
      const p = await getPortfolio();
      return JSON.stringify({ positions: p.positions }, null, 2);
    }
    case "get_balances": {
      const p = await getPortfolio();
      return JSON.stringify({ balances: p.balances }, null, 2);
    }
    case "get_transactions": {
      const days = Number(args.days ?? 90);
      const transactions = await getTransactions(days);
      return JSON.stringify({ transactions, days }, null, 2);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function jsonrpc(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function jsonrpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (BEARER && auth !== `Bearer ${BEARER}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { jsonrpc: string; id: unknown; method: string; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return jsonrpcError(null, -32700, "Parse error");
  }

  const { id, method, params = {} } = body;

  try {
    switch (method) {
      case "initialize":
        return jsonrpc(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "stonkbro-snaptrade", version: "1.0.0" },
        });

      case "notifications/initialized":
        return new NextResponse(null, { status: 204 });

      case "tools/list":
        return jsonrpc(id, { tools: TOOLS });

      case "tools/call": {
        const { name, arguments: args = {} } = params as { name: string; arguments?: Record<string, unknown> };
        const text = await callTool(name, args);
        return jsonrpc(id, { content: [{ type: "text", text }] });
      }

      default:
        return jsonrpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonrpcError(id, -32603, msg);
  }
}

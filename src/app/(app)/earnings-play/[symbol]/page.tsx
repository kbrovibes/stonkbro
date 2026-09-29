import EarningsPlayDetail from "./EarningsPlayDetail";

export default async function EarningsPlaySymbolPage({ params }: { params: Promise<{ symbol: string }> }) {
  const symbol = decodeURIComponent((await params).symbol).toUpperCase();
  return <EarningsPlayDetail key={symbol} symbol={symbol} />;
}

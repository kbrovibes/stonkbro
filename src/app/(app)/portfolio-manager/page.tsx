import OfflineGate from "@/components/OfflineGate";
import { PortfolioManagerView } from "./PortfolioManagerView";

export const dynamic = "force-dynamic";

export default function PortfolioManagerPage() {
  return (
    <OfflineGate label="The portfolio manager">
      <PortfolioManagerView />
    </OfflineGate>
  );
}

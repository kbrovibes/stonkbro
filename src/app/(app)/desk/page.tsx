import OfflineGate from "@/components/OfflineGate";
import DeskView from "./DeskView";

export default function DeskPage() {
  return (
    <OfflineGate label="Trading Desk">
      <DeskView />
    </OfflineGate>
  );
}

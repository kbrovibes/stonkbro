/** A 0–100 composite in an amber ring. Shared by the LEAPS panel and the PMCC detail card. */
export default function ScoreCircle({ score, label }: { score: number; label: string }) {
  return (
    <span
      className="refresh-mono"
      aria-label={`${label} ${score}`}
      style={{
        width: 48,
        height: 48,
        flex: "none",
        borderRadius: "50%",
        border: "1px solid var(--accent-border-strong)",
        background: "var(--accent-bg)",
        color: "var(--accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 17,
        fontWeight: 700,
      }}
    >
      {score}
    </span>
  );
}

export default function BridgeErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="font-mono-display"
      style={{
        fontSize: 10,
        color: "#b3261e",
        background: "#fdecea",
        border: "1px solid #b3261e",
        padding: "6px 10px",
        margin: "8px 0",
      }}
    >
      ⚠ {message}
    </div>
  );
}
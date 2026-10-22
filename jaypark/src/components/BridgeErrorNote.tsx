export default function BridgeErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="bridge-error">
      {message}
    </div>
  );
}
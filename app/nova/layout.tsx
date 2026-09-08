import "./_ui/tokens.css";

export default function NovaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="nova-root min-h-screen relative overflow-x-hidden">
      <div className="relative">{children}</div>
    </div>
  );
}

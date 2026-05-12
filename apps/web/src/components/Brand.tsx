import { DatabaseZap } from "lucide-react";

export function Brand() {
  return (
    <a className="brand" href="/databases" aria-label="Debby home">
      <span className="brand-mark">
        <DatabaseZap size={14} strokeWidth={2} />
      </span>
      <span>debby</span>
    </a>
  );
}

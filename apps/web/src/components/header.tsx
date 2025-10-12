import { ModeToggle } from "./mode-toggle";

export default function Header() {
  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <h2>Debby</h2>
        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}

import { NavContent } from "@/features/shell/NavContent";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-surface print:hidden lg:flex lg:flex-col">
      <NavContent />
    </aside>
  );
}

import { useShellStore } from "@/features/shell/shell-store";
import { NavContent } from "@/features/shell/NavContent";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const collapsed = useShellStore((state) => state.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-surface transition-[width] duration-300 print:hidden lg:flex lg:flex-col",
        collapsed ? "w-[76px]" : "w-60",
      )}
    >
      <NavContent collapsed={collapsed} />
    </aside>
  );
}

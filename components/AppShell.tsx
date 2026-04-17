"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide shell on fullscreen viewer pages
  const isFullscreen =
    pathname?.startsWith("/watch/") || pathname?.startsWith("/record");

  if (isFullscreen) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto bg-[var(--muted)]">{children}</main>
      </div>
    </div>
  );
}

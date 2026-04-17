"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Star,
  Library,
  BarChart3,
  Sparkles,
  Settings,
  Video,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/favorites", label: "Favorites", icon: Star },
  { href: "/library", label: "Content Library", icon: Library },
  { href: "/spaces", label: "Spaces", icon: Users, badge: "New" },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/ai", label: "AI Studio", icon: Sparkles, badge: "Beta" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] shrink-0 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] flex flex-col">
      <div className="h-[64px] px-5 flex items-center gap-2 border-b border-white/10">
        <div className="size-8 rounded-lg bg-white/15 grid place-items-center">
          <Video className="size-[18px]" />
        </div>
        <div className="font-semibold tracking-tight text-[17px]">
          Record<span className="text-white/70">.me</span>
        </div>
      </div>

      <div className="px-3 py-4">
        <Link
          href="/record"
          className="group w-full flex items-center justify-center gap-2 rounded-full bg-white text-[var(--sidebar)] font-semibold py-2.5 text-sm hover:opacity-95 transition"
        >
          <span className="size-2 rounded-full bg-red-500 rec-dot" />
          New Recording
        </Link>
      </div>

      <nav className="px-2 mt-1 flex-1 space-y-1">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium transition",
                active
                  ? "bg-white text-[var(--sidebar-active-foreground)] shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.badge ? (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-semibold">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm text-white/80 hover:bg-white/10 hover:text-white"
        >
          <Settings className="size-[18px]" />
          Settings
        </Link>
        <div className="mt-3 px-3 py-2.5 rounded-xl bg-white/10 flex items-center gap-3">
          <div className="size-8 rounded-full bg-gradient-to-br from-pink-400 to-red-500 grid place-items-center text-xs font-bold">
            ME
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">My Workspace</div>
            <div className="text-[10px] text-white/60 truncate">Free plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

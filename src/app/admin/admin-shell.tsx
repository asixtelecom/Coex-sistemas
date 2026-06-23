"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "\u2302" },
  { href: "/admin/users", label: "Usu\u00e1rios", icon: "\U0001f465" },
  { href: "/admin/accounts", label: "Contas", icon: "\U0001f3e2" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex h-screen">
      <nav className="w-64 border-r bg-muted/30 p-4 flex flex-col gap-2">
        <div className="text-lg font-bold mb-4 px-2">Admin CRM</div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === item.href
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <div className="mt-auto pt-4 border-t">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {"\u2190"} Voltar ao CRM
          </Link>
        </div>
      </nav>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

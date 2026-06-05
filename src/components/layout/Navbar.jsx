"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, Headphones, LogOut, Menu, Moon, PlusCircle, Sun, UserRound } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

const links = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Items" },
  { href: "/contact", label: "Contact" }
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const signOut = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/85 shadow-sm backdrop-blur dark:border-stone-800 dark:bg-stone-950/85">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-black text-ink dark:text-stone-50">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-meadow text-white">
            <Boxes className="h-5 w-5" />
          </span>
          GearNest
        </Link>
        <button className="rounded-lg border border-stone-200 p-2 md:hidden dark:border-stone-800" onClick={() => setOpen((value) => !value)} aria-label="Open menu">
          <Menu />
        </button>
        <div className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-14 flex-col gap-2 border-b bg-mist p-4 dark:border-stone-800 dark:bg-stone-950 md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`rounded-lg px-3 py-2 text-sm font-semibold ${pathname === link.href ? "bg-white text-meadow shadow-sm dark:bg-stone-900" : "text-stone-700 hover:text-meadow dark:text-stone-200"}`}>
              {link.label}
            </Link>
          ))}
          <button onClick={toggleTheme} className="btn-secondary" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {user?.role === "admin" && (
            <Link href="/add-property" className="btn-secondary">
              <PlusCircle className="h-4 w-4" /> Add
            </Link>
          )}
          {user ? (
            <>
              <Link href={user.role === "admin" ? "/admin" : "/dashboard"} className="btn-secondary">
                <UserRound className="h-4 w-4" /> Dashboard
              </Link>
              <button onClick={signOut} className="btn-primary">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/contact" className="btn-secondary hidden lg:inline-flex">
                <Headphones className="h-4 w-4" /> Support
              </Link>
              <Link href="/login" className="btn-primary">Login</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

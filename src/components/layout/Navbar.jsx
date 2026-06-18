"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, PlusCircle, Search, ShoppingCart, UserRound } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

const links = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Items" }
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const signOut = () => {
    logout();
    router.push("/");
  };

  const searchItems = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    router.push(`/properties${params.toString() ? `?${params.toString()}` : ""}`);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-violet-100 bg-white/85 shadow-sm backdrop-blur-xl dark:border-violet-900/70 dark:bg-[#11071f]/88">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center" aria-label="Zasoota home">
          <img
            src="/zasoota-logo.svg"
            alt="Zasoota logo"
            className="h-12 w-36 shrink-0 rounded-2xl object-cover shadow-soft transition group-hover:-translate-y-0.5 group-hover:scale-[1.03] group-hover:shadow-glow sm:h-14 sm:w-44"
          />
        </Link>
        <form onSubmit={searchItems} className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-violet-300/70 bg-violet-950/90 p-1.5 shadow-sm ring-1 ring-white/25 backdrop-blur-xl lg:flex dark:border-violet-800/80 dark:bg-violet-950/80">
          <Search className="ml-3 h-4 w-4 shrink-0 text-white" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-white outline-none placeholder:text-white/90"
            placeholder="Search projectors, speakers, cameras..."
          />
          <button type="submit" className="rounded-full bg-white px-4 py-2 text-xs font-black text-meadow shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
            Search
          </button>
        </form>
        <button className="rounded-xl border border-violet-100 bg-white/80 p-2 text-ink shadow-sm md:hidden dark:border-violet-900/70 dark:bg-white/10 dark:text-white" onClick={() => setOpen((value) => !value)} aria-label="Open menu">
          <Menu />
        </button>
        <div className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-16 flex-col gap-2 border-b border-violet-100 bg-mist/95 p-4 shadow-soft backdrop-blur-xl dark:border-violet-900/70 dark:bg-[#11071f]/96 md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          <form onSubmit={searchItems} className="flex items-center gap-2 rounded-full border border-violet-300/70 bg-violet-950/90 p-1.5 lg:hidden dark:border-violet-900/70 dark:bg-violet-950/80">
            <Search className="ml-3 h-4 w-4 text-white" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-white outline-none placeholder:text-white/90"
              placeholder="Search gear"
            />
            <button type="submit" className="rounded-full bg-white px-3 py-2 text-xs font-black text-meadow">
              Go
            </button>
          </form>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`rounded-xl px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${pathname === link.href ? "bg-white text-meadow shadow-sm dark:bg-white/10" : "text-violet-950/75 hover:bg-white/65 hover:text-meadow dark:text-violet-100/80"}`}>
              {link.label}
            </Link>
          ))}
          <Link href="/cart" className="btn-secondary relative" aria-label="Cart">
            <ShoppingCart className="h-4 w-4" /> Cart
            {count > 0 && (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-fuchsia-500 px-1 text-[0.65rem] font-black text-white">
                {count}
              </span>
            )}
          </Link>
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
            <Link href="/login" className="btn-primary">Login</Link>
          )}
        </div>
      </nav>
    </header>
  );
}

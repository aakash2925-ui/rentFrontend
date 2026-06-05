import Link from "next/link";
import { Boxes, Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
        <div>
          <p className="flex items-center gap-2 text-lg font-black">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-meadow text-white"><Boxes className="h-5 w-5" /></span>
            GearNest
          </p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600 dark:text-stone-300">Rent projectors, speakers, cameras, lights, and production gear with clear availability and admin-managed inventory.</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <strong className="text-ink dark:text-stone-100">Explore</strong>
          <Link href="/properties" className="text-stone-600 hover:text-meadow dark:text-stone-300">Items</Link>
          <Link href="/properties?type=Projector" className="text-stone-600 hover:text-meadow dark:text-stone-300">Projectors</Link>
          <Link href="/properties?type=Speaker" className="text-stone-600 hover:text-meadow dark:text-stone-300">Speakers</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <strong className="text-ink dark:text-stone-100">Account</strong>
          <Link href="/login" className="text-stone-600 hover:text-meadow dark:text-stone-300">Login</Link>
          <Link href="/register" className="text-stone-600 hover:text-meadow dark:text-stone-300">Register</Link>
          <Link href="/contact" className="text-stone-600 hover:text-meadow dark:text-stone-300">Contact</Link>
        </div>
        <div className="space-y-3 text-sm text-stone-600 dark:text-stone-300">
          <strong className="block text-ink dark:text-stone-100">Help desk</strong>
          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-meadow" /> +91 98765 43210</p>
          <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-meadow" /> hello@gearnest.local</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-meadow" /> Bengaluru, Karnataka</p>
        </div>
      </div>
      <div className="border-t border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-4 py-4 text-xs text-stone-500 dark:text-stone-400 sm:flex-row">
          <span>Built with Next.js, Express, and MongoDB.</span>
          <span>Inventory-first rentals for events, creators, and teams.</span>
        </div>
      </div>
    </footer>
  );
}

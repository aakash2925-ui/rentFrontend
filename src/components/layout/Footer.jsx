import Link from "next/link";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-violet-100 bg-white/85 backdrop-blur dark:border-violet-900/70 dark:bg-[#11071f]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
        <div>
          <img src="/zasoota-logo.svg" alt="Zasoota logo" className="h-14 w-44 rounded-2xl object-cover shadow-soft" />
          <p className="mt-3 max-w-sm text-sm leading-6 text-violet-950/65 dark:text-violet-100/70">Access over ownership for projectors, speakers, cameras, luggage, fashion, and more — delivered to your doorstep.</p>
          <div className="mt-4 flex gap-2">
            <a href="https://www.instagram.com/zasoota?igsh=MTE1Y2swMHdjZTNmag%3D%3D" className="btn-secondary px-3" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="https://www.facebook.com/profile.php?id=61589487382038" className="btn-secondary px-3" target="_blank" rel="noreferrer" aria-label="Facebook">
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <strong className="text-ink dark:text-stone-100">Explore</strong>
          <Link href="/properties" className="text-violet-950/65 hover:text-meadow dark:text-violet-100/70">Items</Link>
          <Link href="/properties?type=Projector" className="text-violet-950/65 hover:text-meadow dark:text-violet-100/70">Projectors</Link>
          <Link href="/properties?type=Speaker" className="text-violet-950/65 hover:text-meadow dark:text-violet-100/70">Speakers</Link>
          <Link href="/properties?type=Luggage" className="text-violet-950/65 hover:text-meadow dark:text-violet-100/70">Luggage</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <strong className="text-ink dark:text-stone-100">Account</strong>
          <Link href="/login" className="text-violet-950/65 hover:text-meadow dark:text-violet-100/70">Login</Link>
          <Link href="/register" className="text-violet-950/65 hover:text-meadow dark:text-violet-100/70">Register</Link>
          <Link href="/contact" className="text-violet-950/65 hover:text-meadow dark:text-violet-100/70">Contact</Link>
        </div>
        <div className="space-y-3 text-sm text-violet-950/65 dark:text-violet-100/70">
          <strong className="block text-ink dark:text-stone-100">Help desk</strong>
          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-meadow" /> 8796318284</p>
          <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-meadow" /> zasoota.in@gmail.com</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-meadow" /> Doorstep delivery</p>
        </div>
      </div>
      <div className="border-t border-violet-100 dark:border-violet-900/70">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-4 py-4 text-xs text-violet-950/50 dark:text-violet-100/50 sm:flex-row">
          <span>www.zasoota.com</span>
          <span>Rent. Use. Return.</span>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-mist dark:bg-[#11071f]">
      <div className="absolute inset-0 -z-10 bg-[#ead7ff] dark:bg-[#11071f]">
        <img
          src="/zasoota-home-bg.png"
          alt="Zasoota rent use return product background"
          className="h-full w-full object-contain object-right opacity-38 dark:opacity-34 md:opacity-70 md:dark:opacity-62"
        />
        <div className="absolute inset-0 bg-white/32 dark:bg-[#11071f]/42 md:bg-white/18 md:dark:bg-[#11071f]/24" />
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.02fr_0.98fr] md:py-14">
        <div className="animate-rise flex flex-col justify-center rounded-[1.75rem] bg-white/50 p-4 shadow-sm backdrop-blur-sm dark:bg-[#11071f]/50 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0 md:dark:bg-transparent">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-white/75 px-3 py-1 text-xs font-black uppercase tracking-wide text-meadow shadow-sm backdrop-blur dark:border-violet-800 dark:bg-white/10 dark:text-violet-100">
            <Sparkles className="h-4 w-4" /> Zasoota
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[1.02] text-ink drop-shadow-sm dark:text-stone-50 md:text-7xl">
            Access Over Ownership
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-violet-950/78 dark:text-violet-100/86 md:font-normal">
            Rent projectors, speakers, cameras, luggage, fashion and more — delivered to your doorstep.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/items" className="btn-primary px-5 py-3">
              Rent Now <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#browse-categories" className="btn-secondary px-5 py-3">
              Browse Categories
            </Link>
          </div>
        </div>
        {/* <div className="float-soft min-h-[210px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/30 p-3 shadow-glow backdrop-blur dark:border-violet-900/70 dark:bg-white/10 md:min-h-[235px]">
          <div className="relative h-full min-h-[188px] overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-violet-950 via-violet-800 to-fuchsia-700 p-4 text-white md:min-h-[213px]" aria-label="Animated rental categories">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.34),transparent_24%),radial-gradient(circle_at_80%_75%,rgba(240,229,250,0.24),transparent_28%)]" />
            <div className="absolute left-8 top-1/2 h-14 w-[72%] -translate-y-1/2 rounded-full bg-gradient-to-r from-white/45 via-fuchsia-200/25 to-transparent blur-xl" />
            <div className="absolute left-5 top-1/2 grid h-20 w-28 -translate-y-1/2 place-items-center rounded-[1.35rem] border border-white/25 bg-white/15 shadow-soft backdrop-blur">
              <Projector className="h-12 w-12" />
            </div>
            <div className="float-orbit-a absolute right-7 top-6 grid h-16 w-16 place-items-center rounded-[1.35rem] border border-white/25 bg-white/20 shadow-soft backdrop-blur">
              <Speaker className="h-9 w-9" />
            </div>
            <div className="float-orbit-b absolute right-28 bottom-7 grid h-16 w-16 place-items-center rounded-[1.25rem] border border-white/25 bg-white/18 shadow-soft backdrop-blur">
              <Camera className="h-8 w-8" />
            </div>
            <div className="float-orbit-c absolute right-9 bottom-9 grid h-14 w-14 place-items-center rounded-[1.2rem] border border-white/25 bg-white/16 shadow-soft backdrop-blur">
              <Luggage className="h-8 w-8" />
            </div>
            <div className="float-orbit-b absolute left-[42%] top-5 grid h-14 w-14 place-items-center rounded-[1.2rem] border border-white/25 bg-white/16 shadow-soft backdrop-blur [animation-delay:700ms]">
              <Shirt className="h-8 w-8" />
            </div>
            <div className="float-orbit-a absolute left-[32%] bottom-5 grid h-14 w-14 place-items-center rounded-[1.2rem] border border-white/25 bg-white/16 shadow-soft backdrop-blur [animation-delay:1000ms]">
              <PartyPopper className="h-8 w-8" />
            </div>
            <div className="absolute bottom-4 left-5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/90 backdrop-blur">
              Rent. Use. Return.
            </div>
            <div className="absolute right-16 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_28px_12px_rgba(255,255,255,0.45)] animate-pulse" />
          </div>
        </div> */}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[400px] overflow-hidden bg-mist dark:bg-[#11071f]">
      <div className="absolute inset-0 -z-10 bg-[#ead7ff] dark:bg-[#11071f]">
        <img
          src="/zasoota-home-bg.png"
          alt="Zasoota rent use return product background"
          className="h-full w-full object-fill object-center opacity-48 dark:opacity-42 md:object-center md:opacity-88 md:dark:opacity-76"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/56 to-white/8 dark:from-[#11071f]/92 dark:via-[#11071f]/60 dark:to-[#11071f]/12" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-mist via-mist/50 to-transparent dark:from-[#11071f] dark:via-[#11071f]/50" />
      </div>
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-14 md:grid-cols-[1.02fr_0.98fr] md:py-16">
        <div className="animate-rise flex flex-col justify-center">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-white/75 px-3 py-1 text-xs font-black uppercase tracking-wide text-meadow shadow-sm backdrop-blur dark:border-violet-800 dark:bg-white/10 dark:text-violet-100">
            <Sparkles className="h-4 w-4" /> Zasoota
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[1.02] text-ink drop-shadow-[0_2px_16px_rgba(255,255,255,0.78)] dark:text-stone-50 dark:drop-shadow-[0_2px_18px_rgba(17,7,31,0.9)] md:text-7xl">
            Access Over Ownership
          </h1>
          <p className="mt-5 max-w-2xl rounded-2xl bg-white/35 p-3 text-lg font-semibold leading-8 text-violet-950/86 shadow-sm backdrop-blur-[2px] dark:bg-[#11071f]/35 dark:text-violet-100/90 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0 md:font-normal">
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

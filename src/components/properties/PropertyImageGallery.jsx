"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { uploadUrl } from "@/lib/api";

export default function PropertyImageGallery({ images = [], title }) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const gallery = images.length ? images : [null];
  const hasMultipleImages = gallery.length > 1;
  const activeImage = uploadUrl(gallery[active]);
  const moveImage = useCallback((direction) => {
    setActive((current) => (current + direction + gallery.length) % gallery.length);
  }, [gallery.length]);

  useEffect(() => {
    if (!fullscreen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setFullscreen(false);
      if (event.key === "ArrowLeft" && hasMultipleImages) moveImage(-1);
      if (event.key === "ArrowRight" && hasMultipleImages) moveImage(1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen, hasMultipleImages, moveImage]);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-violet-100 bg-white/90 p-3 shadow-soft dark:border-violet-900/70 dark:bg-white/10">
      <div className="grid gap-3 lg:grid-cols-[92px_1fr]">
        <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-2">
          {hasMultipleImages && (
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-100 bg-white text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-900/70 dark:bg-stone-950 dark:text-violet-100"
              onClick={() => moveImage(-1)}
              type="button"
              aria-label="Previous thumbnail"
            >
              <ChevronLeft className="h-4 w-4 rotate-90" />
            </button>
          )}
            <div className="scrollbar-thin flex max-h-[520px] w-full flex-col gap-2 overflow-y-auto pr-1">
              {gallery.map((image, index) => (
                <ThumbnailButton
                  key={`${image}-${index}`}
                  active={active === index}
                  image={image}
                  index={index}
                  onSelect={() => setActive(index)}
                  title={title}
                />
              ))}
            </div>
          {hasMultipleImages && (
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-100 bg-white text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-900/70 dark:bg-stone-950 dark:text-violet-100"
              onClick={() => moveImage(1)}
              type="button"
              aria-label="Next thumbnail"
            >
              <ChevronRight className="h-4 w-4 rotate-90" />
            </button>
          )}
        </div>

        <div className="relative overflow-hidden rounded-[1.25rem] bg-violet-50 dark:bg-violet-950/50">
          <button
            className="group block aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-stone-100 dark:bg-stone-900"
            onClick={() => setFullscreen(true)}
            type="button"
            aria-label="Open full image gallery"
          >
            <img
              key={activeImage}
              src={activeImage}
              alt={title}
              className="h-full w-full object-contain opacity-0 transition duration-500 animate-[fadeIn_0.35s_ease-out_forwards] lg:group-hover:scale-110"
              loading="eager"
            />
          </button>
          {hasMultipleImages && (
            <>
              <button className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-soft transition hover:scale-105 lg:hidden" onClick={() => moveImage(-1)} aria-label="Previous image" type="button">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-soft transition hover:scale-105 lg:hidden" onClick={() => moveImage(1)} aria-label="Next image" type="button">
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-ink shadow-soft">{active + 1} / {gallery.length}</span>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {gallery.map((image, index) => (
          <div key={`${image}-${index}`} className="w-20 shrink-0">
            <ThumbnailButton
              active={active === index}
              image={image}
              index={index}
              onSelect={() => setActive(index)}
              title={title}
            />
          </div>
        ))}
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 p-4">
          <button className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 text-ink shadow-soft transition hover:scale-105" onClick={() => setFullscreen(false)} aria-label="Close gallery" type="button">
            <X className="h-5 w-5" />
          </button>
          {hasMultipleImages && (
            <>
              <button className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-soft transition hover:scale-105" onClick={() => moveImage(-1)} aria-label="Previous image" type="button">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-soft transition hover:scale-105" onClick={() => moveImage(1)} aria-label="Next image" type="button">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <div className="flex h-full items-center justify-center">
            <img src={activeImage} alt={title} className="max-h-full max-w-full rounded-lg object-contain" />
          </div>
          {hasMultipleImages && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-ink shadow-soft">
              {active + 1} / {gallery.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ThumbnailButton({ active, image, index, onSelect, title }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onSelect}
      className={`aspect-square w-full overflow-hidden rounded-xl border-2 bg-white p-1 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-soft dark:bg-stone-950 ${
        active ? "border-meadow shadow-glow ring-2 ring-meadow/20" : "border-violet-100 hover:border-violet-300 dark:border-violet-900/70"
      }`}
      aria-label={`Show image ${index + 1}`}
    >
      <img src={uploadUrl(image)} alt={`${title} thumbnail ${index + 1}`} className="h-full w-full rounded-lg object-cover" loading="lazy" />
    </button>
  );
}

"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { uploadUrl } from "@/lib/api";

export default function PropertyImageGallery({ images = [], title }) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const gallery = images.length ? images : [null];
  const hasMultipleImages = gallery.length > 1;
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
    <div className="space-y-3">
      <div className="aspect-[16/10] overflow-hidden rounded-lg bg-stone-100">
        <button className="h-full w-full" onClick={() => setFullscreen(true)} type="button">
          <img src={uploadUrl(gallery[active])} alt={title} className="h-full w-full object-cover" />
        </button>
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
            <img src={uploadUrl(gallery[active])} alt={title} className="max-h-full max-w-full rounded-lg object-contain" />
          </div>
          {hasMultipleImages && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-ink shadow-soft">
              {active + 1} / {gallery.length}
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
        {gallery.map((image, index) => (
          <button key={`${image}-${index}`} onClick={() => setActive(index)} className={`aspect-video overflow-hidden rounded-lg border ${active === index ? "border-meadow" : "border-transparent"}`}>
            <img src={uploadUrl(image)} alt={`${title} ${index + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { uploadUrl } from "@/lib/api";

export default function PropertyImageGallery({ images = [], title }) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const gallery = images.length ? images : [null];

  return (
    <div className="space-y-3">
      <div className="aspect-[16/10] overflow-hidden rounded-lg bg-stone-100">
        <button className="h-full w-full" onClick={() => setFullscreen(true)} type="button">
          <img src={uploadUrl(gallery[active])} alt={title} className="h-full w-full object-cover" />
        </button>
      </div>
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 p-4">
          <button className="absolute right-4 top-4 rounded-full bg-white p-2 text-ink" onClick={() => setFullscreen(false)} aria-label="Close gallery">
            <X className="h-5 w-5" />
          </button>
          <div className="flex h-full items-center justify-center">
            <img src={uploadUrl(gallery[active])} alt={title} className="max-h-full max-w-full rounded-lg object-contain" />
          </div>
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

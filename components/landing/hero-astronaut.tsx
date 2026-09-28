"use client";

import Image from "next/image";
import { useState } from "react";

// El easter egg del hero: tocar al astronauta le da un impulso.
export function HeroAstronaut() {
  const [boostCount, setBoostCount] = useState(0);

  return (
    <button
      type="button"
      aria-label="Darle impulso al astronauta"
      onClick={() => setBoostCount((count) => count + 1)}
      className="relative block size-full rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {/* La key vuelve a montar la capa en cada clic para repetir el impulso. */}
      <span
        key={boostCount}
        className={boostCount > 0 ? "mascot-scroll-motion absolute inset-0" : "absolute inset-0"}
      >
        <Image
          src="/astronauta-vuelo.webp"
          alt=""
          fill
          sizes="(min-width: 1024px) 290px, (min-width: 640px) 240px, 170px"
          loading="eager"
          fetchPriority="high"
          className="object-contain drop-shadow-2xl"
        />
      </span>
    </button>
  );
}

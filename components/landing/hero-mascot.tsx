"use client";

import Image from "next/image";
import { useState } from "react";

import { launchConfetti } from "@/components/gamification/celebrate";
import { cn } from "@/lib/utils";

import { HERO_POSE_CYCLE, MASCOT_POSES, nextHeroPose, type MascotPoseId } from "./mascot-poses";

const MASCOT_SIZES = "(min-width: 640px) 320px, 256px";

// El easter egg de la landing: tocar a la mascota la cambia de pose y lanza confetti.
export function HeroMascot() {
  const [poseId, setPoseId] = useState<MascotPoseId>(HERO_POSE_CYCLE[0]);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const upcomingPoseId = nextHeroPose(poseId);

  function handleClick() {
    setPoseId(upcomingPoseId);
    setHasBeenTouched(true);
    launchConfetti().catch((error: unknown) => {
      console.error("[landing] confetti:", error);
    });
  }

  return (
    <div className="relative mx-auto flex size-72 items-center justify-center sm:size-96">
      <div aria-hidden="true" className="absolute inset-12 rounded-full bg-primary/30 blur-3xl" />

      {hasBeenTouched ? null : (
        <span
          aria-hidden="true"
          className="absolute top-2 right-2 z-10 rounded-full border bg-card px-3 py-1 text-sm font-medium shadow-brand sm:top-6 sm:right-6"
        >
          ¡Tócame!
        </span>
      )}

      <div className="motion-safe:animate-float">
        <button
          type="button"
          aria-label="Cambiar la pose de la mascota"
          onClick={handleClick}
          className="relative block size-64 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:size-80"
        >
          {/* La key vuelve a montar la imagen en cada cambio para repetir el "pop". */}
          <Image
            key={poseId}
            data-pose={poseId}
            src={MASCOT_POSES[poseId].src}
            alt=""
            fill
            sizes={MASCOT_SIZES}
            loading="eager"
            fetchPriority={hasBeenTouched ? undefined : "high"}
            className={cn(
              "object-contain drop-shadow-2xl",
              hasBeenTouched && "motion-safe:animate-step-pop",
            )}
          />
          {/* La pose siguiente ya descargada, para que el cambio no parpadee. */}
          <Image
            key={`upcoming-${upcomingPoseId}`}
            src={MASCOT_POSES[upcomingPoseId].src}
            alt=""
            aria-hidden="true"
            fill
            sizes={MASCOT_SIZES}
            className="object-contain opacity-0"
          />
        </button>
      </div>
    </div>
  );
}

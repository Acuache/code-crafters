export type MascotPoseId = "rocket" | "wave" | "orb" | "torch" | "orbit" | "flame";

export type MascotPose = { src: string; width: number; height: number };

// Tamaños reales de los archivos de public/: next/image los necesita para reservar el espacio.
export const MASCOT_POSES: Record<MascotPoseId, MascotPose> = {
  rocket: { src: "/streak/celebration-1.webp", width: 512, height: 728 },
  wave: { src: "/astronauta.webp", width: 384, height: 384 },
  orb: { src: "/streak/celebration-2.webp", width: 512, height: 506 },
  torch: { src: "/streak/celebration-3.webp", width: 512, height: 554 },
  orbit: { src: "/streak/celebration-4.webp", width: 512, height: 481 },
  flame: { src: "/streak/reminder.webp", width: 512, height: 637 },
};

// El orden en que cambia la mascota del hero al tocarla.
export const HERO_POSE_CYCLE: readonly MascotPoseId[] = [
  "rocket",
  "wave",
  "orb",
  "torch",
  "orbit",
  "flame",
];

export function nextHeroPose(current: MascotPoseId): MascotPoseId {
  const currentIndex = HERO_POSE_CYCLE.indexOf(current);
  const nextIndex = (currentIndex + 1) % HERO_POSE_CYCLE.length;

  return HERO_POSE_CYCLE[nextIndex];
}

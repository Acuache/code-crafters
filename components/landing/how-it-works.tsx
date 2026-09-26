import {
  ChatCircleTextIcon,
  PathIcon,
  ShareNetworkIcon,
  SparkleIcon,
  TrophyIcon,
} from "@phosphor-icons/react/ssr";

import { Eyebrow } from "@/components/brand/eyebrow";

import { Journey, type JourneyStation } from "./journey";
import { AiMockup } from "./mockups/ai-mockup";
import { EngineMockup } from "./mockups/engine-mockup";
import { ProgressMockup } from "./mockups/progress-mockup";
import { QuizMockup } from "./mockups/quiz-mockup";
import { ShareMockup } from "./mockups/share-mockup";

const STATIONS: JourneyStation[] = [
  {
    id: "quiz",
    title: "Cuéntanos a dónde vas",
    description:
      "Seis preguntas: tu meta, tu nivel, lo que ya dominas, lo que te interesa, cuánto tiempo tienes y, si quieres, qué buscas con tus palabras.",
    icon: <ChatCircleTextIcon weight="bold" />,
    pose: "wave",
    mockup: <QuizMockup />,
  },
  {
    id: "engine",
    title: "El motor arma tu ruta",
    description:
      "Parte de las rutas oficiales de DevTalles: quita lo que ya dominas, suma tus intereses y recorta hasta que quepa en tu tiempo. Cada curso dice por qué entró, y los que salieron, por qué salieron.",
    icon: <PathIcon weight="bold" />,
    pose: "torch",
    mockup: <EngineMockup />,
  },
  {
    id: "ai",
    title: "La IA la hace tuya",
    description:
      "Si escribes qué buscas, la IA ajusta tu ruta a eso y te la explica con tus palabras. ¿Sin IA? Tu ruta se arma igual: la IA suma, nunca decide sola.",
    icon: <SparkleIcon weight="bold" />,
    pose: "orb",
    mockup: <AiMockup />,
  },
  {
    id: "progress",
    title: "Avanza curso a curso",
    description:
      "Tu ruta es un mapa: marca tu avance, aprueba el quiz de cada curso, gana XP, sube de nivel, desbloquea insignias y cuida tu racha.",
    icon: <TrophyIcon weight="bold" />,
    pose: "flame",
    mockup: <ProgressMockup />,
  },
  {
    id: "share",
    title: "Compártela en Discord",
    description:
      "Publica tu ruta con un link. En Discord se ve con su tarjeta, y quien la abra puede copiarla a su cuenta y empezarla desde cero.",
    icon: <ShareNetworkIcon weight="bold" />,
    pose: "orbit",
    mockup: <ShareMockup />,
  },
];

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="como-funciona-title"
      className="scroll-mt-20 py-20 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-14 flex flex-col items-center gap-3 text-center lg:mb-20">
          <Eyebrow>Tu ruta, paso a paso</Eyebrow>
          <h2 id="como-funciona-title" className="text-title text-balance">
            Cómo funciona
          </h2>
        </div>

        <Journey stations={STATIONS} />
      </div>
    </section>
  );
}

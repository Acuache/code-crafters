import { ChatCircleTextIcon, PathIcon, TrophyIcon } from "@phosphor-icons/react/ssr";

import { Eyebrow } from "@/components/brand/eyebrow";

import { Journey, type JourneyStation } from "./journey";
import { AiMockup } from "./mockups/ai-mockup";
import { ProgressMockup } from "./mockups/progress-mockup";
import { QuizMockup } from "./mockups/quiz-mockup";

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
    title: "El motor organiza tus cursos",
    description:
      "El motor usa las rutas oficiales, tu nivel, tus intereses y tu tiempo para incluir u omitir cursos. La IA interpreta el texto libre y ajusta tu perfil; si no está disponible, la ruta igual se genera con tus respuestas cerradas.",
    icon: <PathIcon weight="bold" />,
    pose: "torch",
    mockup: <AiMockup />,
  },
  {
    id: "progress",
    title: "Avanza y comparte tu ruta",
    description:
      "Marca cursos como pendientes, en curso o hechos, aprueba sus quizzes y gana XP. También puedes compartir un enlace público: muestra la ruta, no tu progreso.",
    icon: <TrophyIcon weight="bold" />,
    pose: "flame",
    mockup: <ProgressMockup />,
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

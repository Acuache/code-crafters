"use client";

// Cliente porque components/ui/accordion usa los iconos de Phosphor con contexto.

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const QUESTIONS = [
  {
    question: "¿DevPathlles es gratis?",
    answer:
      "Sí. Solo necesitas entrar con Discord, Google o GitHub para guardar tus rutas. Los cursos se toman en cursos.devtalles.com, con sus propias condiciones.",
  },
  {
    question: "¿De dónde salen los cursos?",
    answer:
      "Del catálogo de DevTalles y de sus rutas oficiales. Cuando DevTalles publica un curso nuevo, se suma desde el panel de administración, sin tocar código.",
  },
  {
    question: "¿Qué hace la IA y qué pasa si no está disponible?",
    answer:
      "Lee lo que escribiste en la última pregunta, ajusta tu ruta a eso y la explica con tus palabras. Si no está disponible, la ruta se arma igual con el motor.",
  },
  {
    question: "¿Puedo tener más de una ruta?",
    answer: "Sí, todas las que quieras, cada una con su propio avance.",
  },
  {
    question: "¿Cómo marco mi avance?",
    answer:
      "En el mapa o en la lista de tu ruta. Cada curso pasa por “Pendiente”, “En curso” y “Hecho”, y los que tienen quiz se completan al aprobarlo.",
  },
  {
    question: "¿Puedo compartir mi ruta?",
    answer: "Sí, con un link público que puedes apagar cuando quieras. Tu avance no se muestra.",
  },
];

export function LandingFaq() {
  return (
    <section
      id="preguntas"
      aria-labelledby="preguntas-title"
      className="scroll-mt-20 border-t bg-surface/40 py-20 lg:py-28"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 id="preguntas-title" className="mb-10 text-center text-title text-balance">
          Preguntas frecuentes
        </h2>
        {/* Sin `multiple`: se abre una sola pregunta a la vez. */}
        <Accordion>
          {QUESTIONS.map(({ question, answer }) => (
            <AccordionItem key={question} value={question}>
              <AccordionTrigger className="text-base">{question}</AccordionTrigger>
              <AccordionContent>
                <p className="text-pretty text-muted-foreground">{answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

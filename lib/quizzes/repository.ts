import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

import {
  generatedQuizSchema,
  type GeneratedQuiz,
  type QuizKind,
  type QuizQuestion,
  type SafeQuiz,
} from "./schema";

export type QuizRecord = {
  id: string;
  title: string;
  kind: QuizKind;
  status: "generating" | "ready" | "failed";
  questions: QuizQuestion[] | null;
  passPercentage: number;
  updatedAt: Date;
};

type QuizTarget = { targetKey: string; title: string; kind: QuizKind };

// Separado de Supabase para poder probar getOrCreateQuiz con un store en memoria.
export type QuizStore = {
  findActive(targetKey: string): Promise<QuizRecord | null>;
  claim(input: QuizTarget): Promise<{ record: QuizRecord; claimed: boolean }>;
  publish(id: string, quiz: GeneratedQuiz): Promise<QuizRecord>;
  fail(id: string, message: string): Promise<void>;
};

type QuizMetadata = { courseId: number; chapterTitle: string | null; model: string };

type Dependencies = {
  store: QuizStore;
  generate(): Promise<GeneratedQuiz>;
  wait?: (milliseconds: number) => Promise<void>;
};

// Si otro usuario está generando el mismo quiz, se lo espera un rato en vez de generarlo dos
// veces: 8 esperas de 500 ms.
const SHARED_WAIT_ATTEMPTS = 8;
const SHARED_WAIT_MS = 500;
// Una generación que lleva más de 2 minutos se da por muerta y otro puede reclamarla.
const STALE_GENERATION_MS = 120_000;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// Lo único que viaja al navegador: sin la opción correcta ni la explicación, que llegan recién con
// el resultado del intento (submit_quiz_attempt).
export function toSafeQuiz(record: QuizRecord): SafeQuiz {
  if (record.status !== "ready" || !record.questions) {
    throw new Error("El quiz todavía no está listo.");
  }

  const questions = record.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options,
  }));

  return {
    id: record.id,
    title: record.title,
    kind: record.kind,
    passPercentage: record.passPercentage,
    questions,
  };
}

// Un quiz se genera una sola vez por curso o capítulo y lo comparten todos los usuarios: así el
// costo de la IA no crece con la cantidad de usuarios.
export async function getOrCreateQuiz(
  input: QuizTarget,
  { store, generate, wait = sleep }: Dependencies,
): Promise<QuizRecord> {
  const existing = await store.findActive(input.targetKey);
  if (existing?.status === "ready") {
    return existing;
  }

  const { record, claimed } = await store.claim(input);
  if (!claimed) {
    return waitForSharedQuiz(store, input.targetKey, wait);
  }

  try {
    const generated = await generate();
    return await store.publish(record.id, generated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await store.fail(record.id, message);
    throw error;
  }
}

async function waitForSharedQuiz(
  store: QuizStore,
  targetKey: string,
  wait: (milliseconds: number) => Promise<void>,
): Promise<QuizRecord> {
  for (let attempt = 0; attempt < SHARED_WAIT_ATTEMPTS; attempt += 1) {
    await wait(SHARED_WAIT_MS);
    const shared = await store.findActive(targetKey);

    if (shared?.status === "ready") {
      return shared;
    }

    if (shared?.status === "failed") {
      break;
    }
  }

  throw new Error("El quiz se sigue preparando. Probá de nuevo en unos segundos.");
}

function fromRow(row: Database["public"]["Tables"]["quizzes"]["Row"]): QuizRecord {
  const parsed = row.questions ? generatedQuizSchema.parse({ questions: row.questions }) : null;

  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    status: row.status,
    questions: parsed?.questions ?? null,
    passPercentage: row.pass_percentage,
    updatedAt: new Date(row.updated_at),
  };
}

// `supabase` es el cliente admin: `quizzes` no tiene políticas para usuarios, porque sus filas
// traen las respuestas correctas.
export function createSupabaseQuizStore(
  supabase: SupabaseClient<Database>,
  metadata: QuizMetadata,
): QuizStore {
  async function findActive(targetKey: string): Promise<QuizRecord | null> {
    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("target_key", targetKey)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? fromRow(data) : null;
  }

  async function claim(input: QuizTarget): Promise<{ record: QuizRecord; claimed: boolean }> {
    const current = await findActive(input.targetKey);

    if (current) {
      const isStale = Date.now() - current.updatedAt.getTime() > STALE_GENERATION_MS;
      const canRetake = current.status === "failed" || (current.status === "generating" && isStale);

      if (!canRetake) {
        return { record: current, claimed: false };
      }

      // El filtro por status hace el reclamo atómico: si dos usuarios reintentan a la vez, solo uno
      // encuentra la fila en el estado que leyó.
      const { data, error } = await supabase
        .from("quizzes")
        .update({
          status: "generating",
          questions: null,
          failure_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.id)
        .eq("status", current.status)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return { record: fromRow(data), claimed: true };
    }

    const { data, error } = await supabase
      .from("quizzes")
      .insert({
        course_id: metadata.courseId,
        kind: input.kind,
        chapter_title: metadata.chapterTitle,
        target_key: input.targetKey,
        title: input.title,
      })
      .select("*")
      .single();

    // El índice único de quiz activo por target_key rechaza al segundo que inserta: ese espera al
    // ganador en vez de fallar.
    if (error) {
      const winner = await findActive(input.targetKey);
      if (winner) {
        return { record: winner, claimed: false };
      }

      throw error;
    }

    return { record: fromRow(data), claimed: true };
  }

  async function publish(id: string, quiz: GeneratedQuiz): Promise<QuizRecord> {
    const { data, error } = await supabase
      .from("quizzes")
      .update({
        status: "ready",
        // Json de Supabase no acepta tuplas tipadas; el contenido ya pasó por generatedQuizSchema.
        questions: quiz.questions as unknown as Json,
        model: metadata.model,
        failure_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return fromRow(data);
  }

  async function fail(id: string, message: string): Promise<void> {
    const { error } = await supabase
      .from("quizzes")
      .update({
        status: "failed",
        questions: null,
        failure_message: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  return { findActive, claim, publish, fail };
}

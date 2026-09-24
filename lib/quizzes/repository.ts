import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";
import { generatedQuizSchema, type GeneratedQuiz, type QuizKind, type QuizQuestion, type SafeQuiz } from "./schema";

export type QuizRecord = {
  id: string; title: string; kind: QuizKind; status: "generating" | "ready" | "failed";
  questions: QuizQuestion[] | null; passPercentage: number; updatedAt: Date;
};
export type QuizStore = {
  findActive(targetKey: string): Promise<QuizRecord | null>;
  claim(input: { targetKey: string; title: string; kind: QuizKind }): Promise<{ record: QuizRecord; claimed: boolean }>;
  publish(id: string, quiz: GeneratedQuiz): Promise<QuizRecord>;
  fail(id: string, message: string): Promise<void>;
};
type QuizMetadata = { courseId: number; chapterTitle: string | null; model: string };
type Dependencies = { store: QuizStore; generate(): Promise<GeneratedQuiz>; wait?: (milliseconds: number) => Promise<void> };

export function toSafeQuiz(record: QuizRecord): SafeQuiz {
  if (record.status !== "ready" || !record.questions) throw new Error("El quiz todavía no está listo.");
  return {
    id: record.id, title: record.title, kind: record.kind, passPercentage: record.passPercentage,
    questions: record.questions.map(({ correctOption: _correct, explanation: _explanation, ...question }) => question),
  };
}

export async function getOrCreateQuiz(
  input: { targetKey: string; title: string; kind: QuizKind },
  { store, generate, wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)) }: Dependencies,
): Promise<QuizRecord> {
  const existing = await store.findActive(input.targetKey);
  if (existing?.status === "ready") return existing;
  const { record, claimed } = await store.claim(input);
  if (!claimed) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await wait(500);
      const shared = await store.findActive(input.targetKey);
      if (shared?.status === "ready") return shared;
      if (shared?.status === "failed") break;
    }
    throw new Error("El quiz se sigue preparando. Intentá de nuevo en unos segundos.");
  }
  try {
    return await store.publish(record.id, await generate());
  } catch (error) {
    await store.fail(record.id, error instanceof Error ? error.message : "Error desconocido");
    throw error;
  }
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

export function createSupabaseQuizStore(
  supabase: SupabaseClient<Database>,
  metadata: QuizMetadata,
): QuizStore {
  return {
    async findActive(targetKey) {
      const { data, error } = await supabase.from("quizzes").select("*")
        .eq("target_key", targetKey).eq("is_active", true).maybeSingle();
      if (error) throw error;
      return data ? fromRow(data) : null;
    },
    async claim(input) {
      const current = await this.findActive(input.targetKey);
      if (current) {
        const stale = Date.now() - current.updatedAt.getTime() > 120_000;
        if (current.status !== "failed" && !(current.status === "generating" && stale)) {
          return { record: current, claimed: false };
        }
        const { data, error } = await supabase.from("quizzes").update({
          status: "generating", questions: null, failure_message: null, updated_at: new Date().toISOString(),
        }).eq("id", current.id).eq("status", current.status).select("*").single();
        if (error) throw error;
        return { record: fromRow(data), claimed: true };
      }
      const { data, error } = await supabase.from("quizzes").insert({
        course_id: metadata.courseId, kind: input.kind, chapter_title: metadata.chapterTitle,
        target_key: input.targetKey, title: input.title,
      }).select("*").single();
      if (error) {
        const winner = await this.findActive(input.targetKey);
        if (winner) return { record: winner, claimed: false };
        throw error;
      }
      return { record: fromRow(data), claimed: true };
    },
    async publish(id, quiz) {
      const { data, error } = await supabase.from("quizzes").update({
        status: "ready", questions: quiz.questions as unknown as Json, model: metadata.model,
        failure_message: null, updated_at: new Date().toISOString(),
      }).eq("id", id).select("*").single();
      if (error) throw error;
      return fromRow(data);
    },
    async fail(id, message) {
      const { error } = await supabase.from("quizzes").update({
        status: "failed", questions: null, failure_message: message.slice(0, 500), updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
  };
}

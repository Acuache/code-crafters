// data/quizzes.json es el insumo del seed (supabase/migrations/20260925140000_seed_course_quizzes.sql):
// cada pregunta tiene que pasar el mismo schema que valida el formulario del admin.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { quizQuestionSchema } from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");

type SeedQuiz = { courseSlug: string; questions: unknown[] };
type RawCourse = { slug: string };

function readDataFile<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, fileName), "utf8")) as T;
}

const seedQuizzes = readDataFile<SeedQuiz[]>("quizzes.json");
const courseSlugs = readDataFile<RawCourse[]>("courses.json").map((course) => course.slug);

describe("data/quizzes.json", () => {
  it("has exactly one quiz for each course in data/courses.json", () => {
    const seedSlugs = seedQuizzes.map((quiz) => quiz.courseSlug);

    expect(seedSlugs).toHaveLength(courseSlugs.length);
    expect(new Set(seedSlugs)).toEqual(new Set(courseSlugs));
  });

  it.each(seedQuizzes.map((quiz) => [quiz.courseSlug, quiz] as const))(
    "%s has three valid questions with distinct ids",
    (_courseSlug, quiz) => {
      expect(quiz.questions).toHaveLength(3);

      const ids = quiz.questions.map((question) => {
        const parsed = quizQuestionSchema.safeParse(question);
        expect(parsed.error).toBeUndefined();
        return parsed.data?.id;
      });
      expect(new Set(ids).size).toBe(3);
    },
  );
});

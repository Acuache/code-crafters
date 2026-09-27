// Prototipo del motor v2 (plan en docs/investigacion/engine-v2-plan.md). Lee el catálogo real de
// Supabase, los Anexos A/B del plan, y escribe las 15 muestras en engine-v2-samples/.
// Uso: node --no-warnings --import ./register.mjs prototype-v2.mjs
// Ya no corre: comparaba contra el motor del spec 04, que el spec 17 reemplazó. Queda como registro.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO_URL = new URL("../../../", import.meta.url);
const REPO = fileURLToPath(REPO_URL).replaceAll("\\", "/");
const R = REPO_URL.href;
const { buildPath } = await import(R + "lib/paths/build-path.ts");
const { GOALS } = await import(R + "lib/paths/goals.ts");
const { INTERESTS, TECH_TO_SLUGS, TECHNOLOGIES } = await import(R + "lib/paths/interests.ts");
const { groupProgramCourseRows } = await import(R + "lib/catalog/catalog.ts");

const env = Object.fromEntries(
  readFileSync(REPO + ".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/"/g, "")]),
);
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const get = async (q) =>
  (await fetch(env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/" + q, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } })).json();

const courses = await get("courses?select=slug,title,hours,difficulty,in_construction&is_active=eq.true");
const programRows = await get("programs?select=slug,name");
const PROGRAM_NAME = Object.fromEntries(programRows.map((x) => [x.slug, x.name]));
const raw = await get("program_courses?select=stage,level,position,note,programs(slug),courses(slug)");
const toRow = (r, level) => ({ programSlug: r.programs.slug, stage: r.stage, level, position: r.position, note: r.note, courseSlug: r.courses.slug });
const programsToday = groupProgramCourseRows(raw.map((r) => toRow(r, r.level)));
// Niveles de Fundamentos tal como quedarían tras la migración del plan.
const FUNDAMENTOS_LEVELS = { "programacion-para-principiantes": "requerido", "git-github-control-versiones-desde-cero": "recomendado" };
const programs = groupProgramCourseRows(
  raw.map((r) => toRow(r, r.programs.slug === "fundamentos" ? (FUNDAMENTOS_LEVELS[r.courses.slug] ?? "opcional") : r.level)),
);
const catalog = courses.map((c) => ({ slug: c.slug, hours: Number(c.hours), difficulty: c.difficulty }));
const info = new Map(courses.map((c) => [c.slug, { h: Number(c.hours), d: c.difficulty, wip: c.in_construction, t: c.title }]));

const plan = readFileSync(REPO + "docs/investigacion/engine-v2-plan.md", "utf8");
const HARD = {}, SOFT = {};
const IV2 = Object.fromEntries(Object.entries(INTERESTS).map(([k, v]) => [k, v.courseSlugs]));
const slugs = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
for (const line of plan.split("## Anexo A")[1].split("## Anexo B")[0].split("\n")) {
  if (!line.startsWith("| `")) continue;
  const c = line.split("|");
  const s = slugs(c[1])[0];
  HARD[s] = slugs(c[2]);
  SOFT[s] = slugs(c[3]);
}
for (const line of plan.split("## Anexo B")[1].split("## Anexo C")[0].split("\n")) {
  if (!line.startsWith("| `")) continue;
  const c = line.split("|");
  IV2[slugs(c[1])[0]] = slugs(c[2]);
}
const EXCLUDE = { "ia-python": ["nodejs-de-cero-a-experto", "nest", "ia-para-developers", "angular-moderno", "react-de-cero", "vue-cero-a-experto"] };
const PROG = "programacion-para-principiantes";

const H = (s) => HARD[s] ?? [], S = (s) => SOFT[s] ?? [];
const DIFF = { principiante: 0, intermedio: 1, avanzado: 2 };
const RANK = { requerido: 3, recomendado: 2, opcional: 1, interes: 0 };
const marked = (s, ints) => ints.some((i) => IV2[i]?.includes(s));
const dif = (s) => DIFF[info.get(s).d];
const T = (s) => info.get(s)?.t ?? s;
const follower = (it) => it.origin === "interes" || it.origin === "opcional" || (it.interest && !it.spine);

function v2(p) {
  const disc = [], mastered = new Set(), items = new Map(), excl = EXCLUDE[p.goal] ?? [], later = [];
  const markMastered = (s) => { if (!mastered.has(s)) { mastered.add(s); H(s).forEach(markMastered); } };
  p.masteredTechnologies.forEach((t) => TECH_TO_SLUGS[t] && markMastered(TECH_TO_SLUGS[t]));
  const beginner = p.level === "empiezo_de_cero";
  const implicit = new Set();
  if (!beginner) { mastered.add(PROG); implicit.add(PROG); }

  const put = (s, d) => {
    const c = items.get(s);
    if (!c) return items.set(s, d);
    const m = RANK[d.origin] > RANK[c.origin] ? { ...c, ...d } : { ...c };
    if (c.spine || d.spine) {
      const src = !c.spine ? d : !d.spine ? c : d.anchor < c.anchor ? d : c;
      Object.assign(m, { spine: true, anchor: src.anchor, stage: src.stage, program: src.program, level: src.origin });
    }
    m.start = c.start || d.start;
    m.base = !m.spine && (c.base || d.base);
    items.set(s, m);
  };
  const usable = (s) => !info.get(s)?.wip && !excl.includes(s);

  if (beginner) {
    const steps = programs.find((x) => x.slug === "fundamentos").steps;
    const first = Math.min(...steps.filter((st) => st.level !== "opcional").map((st) => st.stage));
    for (const st of steps) {
      const s = st.courseSlugs.find(usable);
      if (!s || mastered.has(s)) continue;
      if (st.level === "opcional") { if (marked(s, p.interests)) later.push({ st, ps: "fundamentos", base: true }); continue; }
      put(s, { origin: st.level, program: "fundamentos", anchor: Infinity, spine: false, base: true, start: st.stage === first });
    }
  }
  GOALS[p.goal].programSlugs.forEach((ps, pi) => {
    for (const st of programs.find((x) => x.slug === ps).steps) {
      if (st.level === "opcional") { later.push({ st, ps, pi }); continue; }
      const alts = st.courseSlugs.filter(usable);
      if (!alts.length) { st.courseSlugs.filter((s) => info.get(s)?.wip).forEach((s) => disc.push([s, "todavía está en construcción"])); continue; }
      const s = alts.find((x) => items.has(x) || mastered.has(x) || marked(x, p.interests)) ?? alts[0];
      put(s, { origin: st.level, program: ps, anchor: pi * 100 + st.stage, spine: true, stage: pi * 100 + st.stage, level: st.level });
    }
  });
  for (const [s] of [...items]) if (mastered.has(s)) { items.delete(s); if (!implicit.has(s)) disc.push([s, "ya lo dominas"]); }

  const pull = (s, o) => {
    for (const q of H(s)) {
      if (mastered.has(q)) continue;
      const c = items.get(q);
      if (!c) { items.set(q, { origin: o, program: null, anchor: Infinity, spine: false, pulledFor: [s] }); pull(q, o); continue; }
      if (!c.spine || RANK[o] > RANK[c.origin]) (c.pulledFor ??= []).push(s);
      if (RANK[o] > RANK[c.origin]) { c.origin = o; c.upgraded = true; pull(q, o); }
    }
  };
  for (const [s, it] of [...items]) pull(s, it.origin);

  for (const { st, ps, pi, base } of later) {
    const alts = st.courseSlugs.filter(usable).filter((s) => marked(s, p.interests) && !mastered.has(s));
    if (!alts.length) continue;
    const good = alts.find((s) => H(s).every((q) => items.has(q) || mastered.has(q)));
    if (!good) {
      const missing = H(alts[0]).filter((q) => !items.has(q) && !mastered.has(q)).map(T);
      disc.push([alts[0], "es opcional en la ruta oficial de " + PROGRAM_NAME[ps] + " y coincide con tu interés, pero necesita " + missing.join(" y ") + ", que no está en tu ruta"]);
      continue;
    }
    const label = p.interests.find((i) => IV2[i]?.includes(good));
    put(good, base
      ? { origin: "opcional", program: ps, anchor: Infinity, spine: false, base: true, interest: label }
      : { origin: "opcional", program: ps, anchor: pi * 100 + st.stage, spine: true, stage: pi * 100 + st.stage, level: "opcional", interest: label });
  }

  const budget = Math.round(p.deadlineMonths * 4.33) * p.hoursPerWeek;
  const sum = () => [...items.keys()].reduce((a, s) => a + info.get(s).h, 0);
  const official = sum(), cands = [];
  // Un curso de la meta que también está en la lista de un interés marcado lo menciona en su porqué.
  for (const i of p.interests) for (const s of IV2[i] ?? []) { const it = items.get(s); if (it?.spine) it.interest ??= i; }
  for (const i of p.interests) {
    const opts = (IV2[i] ?? []).filter((s) => !info.get(s)?.wip && !mastered.has(s));
    if (!opts.length) continue;
    if (items.has(opts[0])) { items.get(opts[0]).interest ??= i; continue; }
    const pick = opts.find((s) => !items.has(s) && !cands.some((c) => c.s === s) && H(s).every((q) => items.has(q) || mastered.has(q)));
    if (!pick) {
      if (opts.some((s) => items.has(s))) continue;
      disc.push(["interés:" + INTERESTS[i].label, "no encaja todavía; sus cursos (" + opts.map(T).join("; ") + ") necesitan una base que tu ruta no tiene"]);
      continue;
    }
    cands.push({ s: pick, i, h: info.get(pick).h });
  }
  const interestBudget = Math.max(0.25 * budget, budget - official);
  let spent = 0;
  for (const c of cands.sort((a, b) => a.h - b.h)) {
    if (spent + c.h <= interestBudget) { spent += c.h; items.set(c.s, { origin: "interes", program: null, anchor: Infinity, spine: false, interest: c.i }); }
    else disc.push([c.s, "superaba el cupo de horas para intereses"]);
  }

  const order = () => {
    const pr = [...items.keys()], A = new Map();
    const hardDeps = (s) => pr.filter((d) => H(d).includes(s) && !follower(items.get(d)));
    pr.forEach((s) => A.set(s, items.get(s).spine ? items.get(s).anchor : 1e6));
    const spineBy = () => pr.filter((x) => items.get(x).spine && !items.get(x).start).sort((a, b) => A.get(a) - A.get(b));
    const maxA = () => Math.max(0, ...pr.filter((x) => items.get(x).spine).map((x) => A.get(x)));
    const afterPrereqs = (s) => H(s).filter((q) => A.has(q)).map((q) => A.get(q) + 0.1);
    const difficultyAnchor = (s) => {
      const f = spineBy().find((x) => dif(x) > dif(s)) ?? spineBy().find((x) => x !== s && dif(x) === dif(s));
      return Math.max(f ? A.get(f) - 0.25 : maxA() + 1, ...afterPrereqs(s));
    };
    const toolAnchor = () => { const f = spineBy().find((x) => dif(x) > 0); return f ? A.get(f) + 0.25 : maxA() + 1; };
    for (let k = 0; k < 12; k++) {
      for (const s of pr) {
        const it = items.get(s), ds = hardDeps(s).map((d) => A.get(d) - 0.5);
        if (it.start) A.set(s, -1);
        else if (it.spine && follower(it)) A.set(s, Math.max(it.anchor, ...afterPrereqs(s)));
        else if (it.spine) A.set(s, Math.min(it.anchor, ...ds));
        else if (follower(it) || it.interest) A.set(s, Math.min(difficultyAnchor(s), ...ds));
        else if (it.base) A.set(s, Math.min(toolAnchor(), ...ds));
        else A.set(s, ds.length ? Math.min(...ds) : difficultyAnchor(s));
      }
    }
    const preds = (s) => [...H(s), ...S(s)].filter((q) => items.has(q));
    const done = new Set(), out = [];
    while (out.length < pr.length) {
      const av = pr.filter((s) => !done.has(s) && preds(s).every((q) => done.has(q)));
      if (!av.length) { out.push(...pr.filter((s) => !done.has(s))); break; }
      av.sort((a, b) => A.get(a) - A.get(b) || dif(a) - dif(b) || info.get(a).h - info.get(b).h);
      out.push(av[0]);
      done.add(av[0]);
    }
    return out;
  };

  const needed = (s) => [...items.keys()].some((d) => H(d).includes(s));
  const removed = [];
  while (sum() > budget) {
    const ord = order();
    let v = null;
    for (const o of ["interes", "opcional", "recomendado"]) {
      for (let k = ord.length - 1; k >= 0 && !v; k--) if (items.get(ord[k]).origin === o && !needed(ord[k]) && !items.get(ord[k]).base) v = ord[k];
      if (v) break;
    }
    if (!v) for (let k = ord.length - 1; k >= 0 && !v; k--) { const it = items.get(ord[k]); if (it.base && !it.start && it.origin !== "requerido" && !needed(ord[k])) v = ord[k]; }
    if (!v) break;
    removed.push([v, items.get(v)]);
    items.delete(v);
    for (let ch = true; ch;) {
      ch = false;
      for (const [s, it] of [...items]) if (!it.spine && !it.base && it.origin !== "interes" && !it.interest && !needed(s)) { items.delete(s); ch = true; }
    }
  }
  for (const [s, it] of removed.reverse()) {
    if (sum() + info.get(s).h <= budget && H(s).every((q) => items.has(q) || mastered.has(q))) items.set(s, it);
    else disc.push([s, "no cabía en tu tiempo"]);
  }
  // Con horas de sobra entran más cursos de cada interés marcado, por turnos, si ya tienen su base.
  const fitsWithBase = (s) => sum() + info.get(s).h <= budget && H(s).every((q) => items.has(q) || mastered.has(q));
  for (let added = true; added;) {
    added = false;
    for (const i of p.interests) {
      const next = (IV2[i] ?? []).find((s) => usable(s) && !items.has(s) && !mastered.has(s) && fitsWithBase(s));
      if (!next) continue;
      items.set(next, { origin: "interes", program: null, anchor: Infinity, spine: false, interest: i, extra: true });
      added = true;
    }
  }

  let stage = 0, prevKey = null, prevS = null;
  const steps = [];
  for (const s of order()) {
    const it = items.get(s), key = it.spine && !it.start ? it.program + ":" + it.stage : null;
    const linked = prevS && (H(s).includes(prevS) || S(s).includes(prevS));
    if (!(key && key === prevKey && !linked)) stage++;
    prevKey = key;
    prevS = s;
    steps.push({ s, stage, it });
  }
  const seen = new Set();
  const discarded = disc.filter(([s, w]) => { const k = s + w; if (seen.has(k) || items.has(s)) return false; seen.add(k); return true; });
  return { steps, discarded, total: sum(), budget };
}

const LEVEL_LABEL = { requerido: "Requerido", recomendado: "Recomendado", opcional: "Opcional" };
function reason(it, goal) {
  if (it.start) return "Tu primer paso: aprendes la lógica de programación antes de " + GOALS[goal].label + ".";
  if (it.extra) return "Por tu interés en " + INTERESTS[it.interest].label + "; te sobraba tiempo para sumarlo.";
  if (it.origin === "interes" || (it.interest && !it.spine)) return "Por tu interés en " + INTERESTS[it.interest].label + ".";
  if (it.pulledFor && (!it.spine || it.upgraded)) return "Lo necesitas antes de " + T(it.pulledFor[0]) + ".";
  if (it.base) return "Base para cualquier ruta; llega cuando ya tienes soltura con el lenguaje.";
  const suffix = it.interest ? " Coincide con tu interés en " + INTERESTS[it.interest].label + "." : "";
  return LEVEL_LABEL[it.level ?? it.origin] + " en la ruta oficial de " + PROGRAM_NAME[it.program] + "." + suffix;
}

const TRAMOS = ["Primeros pasos", "Intermedio", "Avanzado"];
const DIFF_LABEL = ["principiante", "intermedio", "avanzado"];
const LEVEL = { empiezo_de_cero: "Empiezo de cero", tengo_bases: "Tengo bases", intermedio: "Intermedio" };
const fmtHours = (h) => String(h).replace(".", ",") + " h";

function render(n, title, p) {
  const today = buildPath(p, catalog, programsToday);
  const next = v2(p);
  const lines = [];
  lines.push("CASO " + String(n).padStart(2, "0") + " — " + title, "");
  lines.push("QUIZ");
  lines.push("- Meta: " + GOALS[p.goal].label);
  lines.push("- Nivel: " + LEVEL[p.level]);
  lines.push("- Ya domino: " + (p.masteredTechnologies.map((t) => TECHNOLOGIES[t].label).join(", ") || "nada todavía"));
  lines.push("- Me interesa: " + (p.interests.map((i) => INTERESTS[i].label).join(", ") || "nada en especial"));
  lines.push("- Tiempo: " + p.hoursPerWeek + " h por semana durante " + p.deadlineMonths + " meses (" + next.budget + " h en total)");
  lines.push("", "RUTA CON EL MOTOR ACTUAL (" + fmtHours(today.totalHours) + ")");
  today.steps.forEach((st, i) => lines.push(String(i + 1).padStart(3) + ". " + T(st.courseSlug)));
  lines.push("", "RUTA CON EL MOTOR NUEVO (" + fmtHours(next.total) + " de " + next.budget + " h)");
  const stageMax = new Map();
  for (const st of next.steps) stageMax.set(st.stage, Math.max(stageMax.get(st.stage) ?? 0, dif(st.s)));
  const stageSize = new Map();
  for (const st of next.steps) stageSize.set(st.stage, (stageSize.get(st.stage) ?? 0) + 1);
  let high = -1, lastStage = null, count = 0;
  for (const st of next.steps) {
    if (st.stage !== lastStage) {
      const d = stageMax.get(st.stage);
      if (d > high) { high = d; lines.push("", "  " + TRAMOS[high]); }
      lastStage = st.stage;
    }
    count++;
    const parallel = stageSize.get(st.stage) > 1 ? " (en paralelo)" : "";
    lines.push(String(count).padStart(5) + ". " + T(st.s) + " — " + fmtHours(info.get(st.s).h) + ", " + DIFF_LABEL[dif(st.s)] + parallel);
    lines.push("       Por qué: " + reason(st.it, p.goal));
  }
  lines.push("", "QUÉ QUITAMOS Y POR QUÉ");
  if (!next.discarded.length) lines.push("- Nada.");
  for (const [s, why] of next.discarded) {
    const label = s.startsWith("interés:") ? "Tu interés en " + s.slice("interés:".length) : T(s);
    lines.push("- " + label + ": " + why + ".");
  }
  return lines.join("\n") + "\n";
}

const P = (goal, o = {}) => ({ goal, level: o.level ?? "empiezo_de_cero", masteredTechnologies: o.dom ?? [], interests: o.int ?? [], hoursPerWeek: o.h ?? 10, deadlineMonths: o.m ?? 6 });
const CASES = [
  ["01-react-beginner", "React desde cero (tu primer ejemplo)", P("react", { int: ["ia-aplicada", "bases-de-datos-sql", "sitios-de-contenido"] })],
  ["02-java-beginner", "Java desde cero (tu segundo ejemplo)", P("java", { int: ["ia-aplicada", "bases-de-datos-sql", "agentes-vibe-coding"] })],
  ["03-react-short-time", "React desde cero con poco tiempo", P("react", { h: 5 })],
  ["04-angular-ai-realtime", "Angular desde cero con IA y tiempo real", P("angular", { h: 8, int: ["ia-aplicada", "tiempo-real"] })],
  ["05-vue-node-testing-docker", "Fullstack Vue + Node desde cero", P("vue-node", { h: 12, m: 8, int: ["testing", "docker"] })],
  ["06-node-with-basics", "Node con bases de JavaScript y Git", P("node", { level: "tengo_bases", dom: ["javascript", "git"], m: 4, int: ["microservicios", "bases-de-datos-sql"] })],
  ["07-nest-intermediate", "NestJS para alguien intermedio", P("nest", { level: "intermedio", dom: ["javascript", "typescript", "node"], h: 6, m: 3, int: ["testing", "microservicios"] })],
  ["08-python-beginner", "Python desde cero", P("python", { int: ["ia-aplicada", "bases-de-datos-sql"] })],
  ["09-ai-python-beginner", "IA con Python desde cero", P("ia-python", { int: ["agentes-vibe-coding"] })],
  ["10-ai-automation-short-time", "IA y automatizaciones con poco tiempo", P("ia", { h: 6, int: ["ia-aplicada"] })],
  ["11-csharp-beginner", "C# / .NET desde cero", P("csharp", { m: 4, int: ["testing", "bases-de-datos-sql", "docker"] })],
  ["12-php-short-time", "PHP desde cero con poco tiempo", P("php", { h: 5, m: 3, int: ["bases-de-datos-sql", "ia-aplicada"] })],
  ["13-go-with-basics", "Go con bases de programación", P("go", { level: "tengo_bases", dom: ["git"], h: 8, m: 4, int: ["microservicios", "docker"] })],
  ["14-flutter-beginner", "Flutter / Dart desde cero", P("dart-movil", { int: ["ia-aplicada"] })],
  ["15-react-native-with-basics", "React Native sabiendo JavaScript", P("react-native", { level: "tengo_bases", dom: ["javascript"], m: 3, int: ["ia-aplicada", "estilos"] })],
];

const outDir = REPO + "engine-v2-samples/";
mkdirSync(outDir, { recursive: true });
CASES.forEach(([file, title, profile], index) => {
  const t0 = performance.now();
  v2(profile);
  const ms = (performance.now() - t0).toFixed(2);
  writeFileSync(outDir + file + ".txt", render(index + 1, title, profile), "utf8");
  console.log(file + ".txt (" + ms + " ms)");
});

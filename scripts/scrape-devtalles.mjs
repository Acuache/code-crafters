#!/usr/bin/env node
/**
 * Extrae el catálogo público de https://cursos.devtalles.com (sin cursos Legacy)
 * y lo deja listo para la app: solo los campos que usan la IA y la interfaz.
 *
 * Uso:   npm i cheerio
 *        node scripts/scrape-devtalles.mjs [carpeta-salida]
 *
 * Genera courses.json, programs.json y SUMMARY.md en la carpeta de salida
 * (por defecto data/, que es donde vive el catálogo versionado del repo).
 * El HTML descargado se guarda en CACHE_DIR (por defecto .cache-devtalles/) para no
 * volver a pedir las mismas páginas al re-ejecutar. Bórrala para refrescar los datos.
 */
import * as cheerio from 'cheerio';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://cursos.devtalles.com';
const OUT_DIR = path.resolve(process.argv[2] ?? 'data');
const CACHE_DIR = path.resolve(process.env.CACHE_DIR ?? '.cache-devtalles');
const DELAY_MS = 500;
const USER_AGENT = 'code-quest-mvp-scraper/1.0 (catalogo para proyecto educativo Code Quest DevTalles)';

// Subsecciones de "Descripción del curso": la primera regla que coincide con el título gana.
// Los títulos que no coinciden con ninguna regla se consideran temas.
const SECTION_RULES = [
  ['prerequisites', /requisito/i],
  ['ignore', /^descripci[oó]n del curso|para qui[eé]n|ideal para|estructura|dividido|flujo del curso/i],
  ['outcomes', /resultado|al finalizar|al terminar|lograr[aá]s|preparado para|habr[aá]s dominado|podr[aá]s aplicarlo|objetivo/i],
  ['topics', /proyecto|reportes que haremos/i],
];
// Títulos de temas genéricos: sus viñetas se guardan tal cual, sin anteponer el título.
const GENERIC_TOPIC_HEADING = /tema|aprender|veremos|dominar|incluye|lista|puntual|stack|énfasis|importante|proyecto/i;
// Capítulos que no aportan información sobre el contenido.
const FILLER_CHAPTER = /^(introducci[oó]n( al curso)?|bienvenid[ao]s?|cierre( del curso)?|fin del curso|despedida|conclusi[oó]n)$/i;
// La página de C# es /pages/ruta-c.
const PROGRAM_SLUG_ALIASES = { c: 'csharp' };
const LEVEL_BY_COLUMN = [
  [/requerido/i, 'requerido'],
  [/recomendado/i, 'recomendado'],
  [/opcional/i, 'opcional'],
];

// ---------- utilidades ----------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (text) => (text ?? '').replace(/\s+/g, ' ').trim();
const unique = (items) => [...new Set(items)];
const isLegacyTitle = (title) => /^legacy\b/i.test(title ?? '');

function toInt(text) {
  const match = (text ?? '').replace(/(\d)[.,](?=\d{3}\b)/g, '$1').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function toHours(text) {
  const match = (text ?? '').match(/\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const value = Number(match[0].replace(',', '.'));
  return /minuto/i.test(text) ? Math.round((value / 60) * 100) / 100 : value;
}

function toPrice(text) {
  if (!text) return null;
  if (/gratis|gratuito|free/i.test(text)) return 0;
  const match = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function slugFromHref(href) {
  if (!href || href === '#') return null;
  try {
    const match = new URL(href, BASE).pathname.match(/^\/courses\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  const cacheFile = path.join(CACHE_DIR, url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_') + '.html');
  if (existsSync(cacheFile)) return readFile(cacheFile, 'utf8');

  for (let attempt = 1; attempt <= 2; attempt++) {
    await sleep(DELAY_MS);
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'es' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      await writeFile(cacheFile, html);
      return html;
    } catch (error) {
      if (attempt === 2) throw new Error(`${url}: ${error.message}`);
      console.warn(`   reintentando ${url} (${error.message})`);
    }
  }
}

async function loadPage(url) {
  const $ = cheerio.load(await fetchHtml(url));
  $('script, style, noscript').remove();
  return $;
}

// ---------- listados ----------

/** Devuelve Map<slug, título> con las tarjetas de curso de una página de listado. */
async function scrapeCardLinks(url) {
  const $ = await loadPage(url);
  const courses = new Map();
  $('a[href*="/courses/"]').each((_, anchor) => {
    const slug = slugFromHref($(anchor).attr('href'));
    const title = clean($(anchor).find('.card__name').text());
    if (slug && title && !courses.has(slug)) courses.set(slug, title);
  });
  return courses;
}

async function scrapeListing() {
  const $ = await loadPage(`${BASE}/pages/todos-los-cursos`);
  const cards = new Map();

  $('a.card[href*="/courses/"]').each((_, anchor) => {
    const card = $(anchor);
    const slug = slugFromHref(card.attr('href'));
    if (!slug || cards.has(slug)) return;

    cards.set(slug, {
      slug,
      title: clean(card.find('.card__name').text()),
      image_url: card.find('.card__img').attr('src') ?? null,
      lessons: toInt(clean(card.find('.card__product-info').text()).split('•')[1]),
      summary: clean(card.find('.card__description').text()) || null,
      price: clean(card.find('.card__price').text()) || null,
      is_new: card.find('.card__badge--new').length > 0,
      is_pro: /PRO/i.test(card.closest('li').attr('data-custom-price') ?? ''),
    });
  });

  return [...cards.values()];
}

// ---------- detalle de curso ----------

/** Separa viñetas "•" de requisitos, ya sea en un solo <p> con <br> o en varios <p>. */
function parseBullets($, body) {
  const blocks = body.children('p, li, div').length ? body.children('p, li, div').toArray() : [body[0]];
  return blocks
    .flatMap((block) => clean($(block).text()).split('•'))
    .map(clean)
    .filter(Boolean);
}

/** Agrupa el bloque de descripción en secciones { heading, paragraphs, items } siguiendo h3/hr/ul. */
function parseRichBlocks($, body) {
  const sections = [];
  let current = { heading: null, paragraphs: [], items: [] };
  const flush = () => {
    if (current.heading && (current.paragraphs.length || current.items.length)) sections.push(current);
  };

  body.children().each((_, element) => {
    const node = $(element);
    const tag = element.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag) || tag === 'hr') {
      flush();
      current = { heading: tag === 'hr' ? null : clean(node.text()), paragraphs: [], items: [] };
    } else if (tag === 'ul' || tag === 'ol') {
      node.children('li').each((_, li) => {
        const text = clean($(li).text());
        if (text) current.items.push(text);
      });
    } else {
      const text = clean(node.text());
      if (text) current.paragraphs.push(text);
    }
  });
  flush();

  return sections;
}

function readAboutSections($) {
  const about = { prerequisites: [], topics: [], outcomes: [] };

  $('.spec-column-clean').each((_, column) => {
    const columnTitle = clean($(column).find('.spec-column-title').first().text());
    const body = $(column).find('.spec-inner-text').first();
    if (!body.length) return;
    if (/requisito/i.test(columnTitle)) {
      about.prerequisites.push(...parseBullets($, body));
      return;
    }

    for (const section of parseRichBlocks($, body)) {
      const [key] = SECTION_RULES.find(([, pattern]) => pattern.test(section.heading)) ?? ['topics'];
      if (key === 'ignore') continue;
      if (key === 'topics') {
        const label = section.heading.replace(/:\s*$/, '');
        about.topics.push(...section.items.map((item) => (GENERIC_TOPIC_HEADING.test(label) ? item : `${label}: ${item}`)));
      } else {
        about[key].push(...(section.items.length ? section.items : section.paragraphs));
      }
    }
  });

  return {
    prerequisites: unique(about.prerequisites),
    topics: unique(about.topics),
    outcomes: unique(about.outcomes),
  };
}

function readChapters($) {
  return unique(
    $('.course-curriculum__chapter-title')
      .toArray()
      .map((title) => clean($(title).text()))
      .filter((title) => !/^archivad/i.test(title))
      .map((title) => title.replace(/^(secci[oó]n|m[oó]dulo)\s*\d+\s*[:.\-–]?\s*/i, '').trim())
      .filter((title) => title && !FILLER_CHAPTER.test(title)),
  );
}

/** Lee /courses/[slug]. `card` viene del listado principal, o es null si el curso se descubrió por otra vía. */
async function scrapeCourse(slug, card, freeSlugs) {
  const url = `${BASE}/courses/${slug}`;
  const $ = await loadPage(url);

  const details = { price: null, lessons: null, hours: null, instructor: null, status: '' };
  $('.course-curriculum-card__details-item').each((_, item) => {
    const icon = $(item).find('i').attr('class') ?? '';
    const text = clean($(item).find('span').text());
    if (!text) return;
    if (icon.includes('fa-tag')) details.price = text;
    else if (icon.includes('fa-file-lines')) details.lessons = toInt(text);
    else if (icon.includes('fa-circle-play')) details.hours = toHours(text);
    else if (icon.includes('fa-graduation-cap')) details.instructor = text;
    else if (icon.includes('fa-wrench')) details.status = text;
  });

  const heading = $('section.banner--course .section__heading').first();
  const badge = clean(heading.find('.devtalles-course-subtitle').text());
  const price = toPrice(details.price ?? card?.price);

  return {
    slug,
    title: clean(heading.clone().find('.devtalles-course-subtitle').remove().end().text()) || card?.title || null,
    summary: card?.summary
      || clean($('section.banner--course .section__subheading').first().text())
      || clean($('meta[name="description"]').attr('content'))
      || null,
    url,
    image_url: card?.image_url ?? $('meta[property="og:image"]').attr('content') ?? null,
    instructor: details.instructor,
    hours: details.hours,
    lessons: details.lessons ?? card?.lessons ?? ($('.course-curriculum__chapter-lesson').length || null),
    price,
    is_free: freeSlugs.has(slug) || price === 0,
    is_pro: Boolean(card?.is_pro) || /PRO/.test(details.status),
    is_new: card?.is_new ?? false,
    in_construction: /construcci/i.test(`${badge} ${details.status}`),
    areas: [],
    ...readAboutSections($),
    chapters: readChapters($),
    related: unique(
      $('section.course-cards a[href*="/courses/"]').toArray().map((anchor) => slugFromHref($(anchor).attr('href'))),
    ).filter((related) => related && related !== slug),
    in_main_listing: Boolean(card), // solo para el resumen; se quita al guardar
  };
}

// ---------- programas / rutas oficiales ----------

/**
 * Cada ruta es un grid CSS de 3 columnas (REQUERIDO / RECOMENDADO / OPCIONAL PERO MUY ÚTIL)
 * con colocación automática: cada hijo directo de .RutaWrapper ocupa una celda.
 */
async function scrapePrograms() {
  const firstUrl = `${BASE}/pages/programas-fundamentos`;
  const $first = await loadPage(firstUrl);
  const links = new Map();
  $first('.prog-link[href]').each((_, anchor) => {
    const url = new URL($first(anchor).attr('href'), BASE).href;
    const name = clean($first(anchor).attr('title')) || clean($first(anchor).find('img').attr('alt'));
    if (!links.has(url)) links.set(url, name);
  });
  if (!links.size) links.set(firstUrl, 'Fundamentos');

  const programs = [];
  for (const [url, name] of links) {
    console.log(`   programa: ${name}`);
    const $ = url === firstUrl ? $first : await loadPage(url);
    const routes = [];

    $('.RutaWrapper').each((_, wrapper) => {
      const cells = $(wrapper).children().toArray();
      const columns = [];
      while (cells.length && $(cells[0]).is('.encabezado')) columns.push(clean($(cells.shift()).text()));
      const columnCount = columns.length || 3;

      const steps = [];
      cells.forEach((cell, index) => {
        const node = $(cell);
        const anchors = node.is('a') ? [cell] : node.find('a[href*="/courses/"]').toArray();
        const courses = anchors
          .map((anchor) => ({
            slug: slugFromHref($(anchor).attr('href')),
            area: clean($(anchor).find('[class$="-text"]:not(.main-text)').first().text()).toLowerCase() || null,
          }))
          .filter((course) => course.slug);
        if (!courses.length) return;

        const column = columns[index % columnCount] ?? '';
        steps.push({
          row: Math.floor(index / columnCount),
          level: LEVEL_BY_COLUMN.find(([pattern]) => pattern.test(column))?.[1] ?? null,
          note: node.find('.encabezado').toArray().map((label) => clean($(label).text())).join(' · ') || null,
          courses,
        });
      });

      const title = clean($(wrapper).parent().find('.titulo').first().text()).replace(/^ruta de aprendizaje\s*/i, '');
      routes.push({ title: title || name, steps });
    });

    const slug = new URL(url).pathname.split('/').pop().replace(/^(programas|ruta)-/, '');
    programs.push({ slug: PROGRAM_SLUG_ALIASES[slug] ?? slug, name, routes });
  }
  return programs;
}

/** Quita cursos Legacy o desconocidos, numera las etapas sin huecos y deja solo slugs. */
function finalizePrograms(programs, catalogSlugs) {
  return programs.map((program) => ({
    ...program,
    routes: program.routes
      .map((route) => {
        const steps = route.steps
          .map((step) => ({ ...step, courses: step.courses.filter((course) => catalogSlugs.has(course.slug)) }))
          .filter((step) => step.courses.length);
        const rows = unique(steps.map((step) => step.row));
        return {
          title: route.title,
          steps: steps.map((step) => ({
            stage: rows.indexOf(step.row) + 1,
            level: step.level,
            note: step.note,
            courses: step.courses.map((course) => course.slug),
          })),
        };
      })
      .filter((route) => route.steps.length),
  }));
}

/** Áreas (bases, frontend, backend…) que DevTalles asigna a cada curso en sus rutas. */
function areasBySlug(programs) {
  const areas = new Map();
  for (const program of programs) {
    for (const route of program.routes) {
      for (const step of route.steps) {
        for (const course of step.courses) {
          if (!course.area) continue;
          areas.set(course.slug, unique([...(areas.get(course.slug) ?? []), course.area]));
        }
      }
    }
  }
  return areas;
}

// ---------- resumen ----------

function buildSummary({ generatedAt, listingCount, courses, unlisted, excluded, programs }) {
  const escape = (text) => String(text ?? '—').replace(/\|/g, '\\|');
  const count = (predicate) => courses.filter(predicate).length;

  return [
    '# Catálogo DevTalles (sin Legacy)',
    '',
    `Extraído el ${generatedAt} desde ${BASE} con \`scrape-devtalles.mjs\`.`,
    '',
    `- Cursos activos: **${courses.length}** (${courses.length - unlisted.length} del listado principal + ${unlisted.length} enlazados desde la home o las rutas)`,
    `- Legacy excluidos: ${excluded.length} · Tarjetas en el listado principal: ${listingCount}`,
    `- Gratis: ${count((c) => c.is_free)} · Exclusivos PRO: ${count((c) => c.is_pro)} · Nuevos: ${count((c) => c.is_new)} · En construcción: ${count((c) => c.in_construction)}`,
    `- Rutas oficiales: ${programs.reduce((total, p) => total + p.routes.length, 0)} en ${programs.length} programas`,
    '',
    '## courses.json',
    '',
    '| Campo | Qué es |',
    '|---|---|',
    '| `slug`, `title`, `url`, `image_url` | Identidad del curso y link a DevTalles |',
    '| `summary` | Descripción corta (1–2 frases) |',
    '| `instructor`, `hours`, `lessons` | Datos del curso |',
    '| `price` | USD; `0` si es gratis, `null` si solo se accede con PRO |',
    '| `is_free`, `is_pro`, `is_new`, `in_construction` | Etiquetas para la UI y para filtrar recomendaciones |',
    '| `areas` | Áreas que DevTalles le asigna en sus rutas (`bases`, `frontend`, `backend`…); vacío si no aparece en ninguna |',
    '| `prerequisites` | Requisitos previos, tal como los escribe DevTalles |',
    '| `topics` | Temas y proyectos del curso |',
    '| `outcomes` | Qué logra el estudiante al terminar |',
    '| `chapters` | Títulos de capítulos (sin "Sección N:", introducción/cierre ni capítulos archivados) |',
    '| `related` | Slugs de "Cursos que podrían interesarte" |',
    '',
    '## programs.json',
    '',
    'Rutas que publica DevTalles. Cada paso tiene `stage` (orden de arriba hacia abajo; varios pasos pueden compartir etapa), `level` (`requerido` / `recomendado` / `opcional`), `note` (texto de la celda, por ejemplo "EN CUALQUIER MOMENTO") y `courses` (slugs; más de uno = cursos alternativos o complementarios del mismo paso).',
    '',
    '## Cursos',
    '',
    '| # | Curso | slug | Horas | Lecciones | Precio | Etiquetas |',
    '|---|---|---|---:|---:|---:|---|',
    ...courses.map((c, index) => {
      const tags = [c.is_pro && 'PRO', c.is_free && 'Gratis', c.is_new && 'Nuevo', c.in_construction && 'En construcción'].filter(Boolean).join(', ');
      const price = c.price == null ? '—' : c.price === 0 ? 'Gratis' : `$${c.price}`;
      return `| ${index + 1} | ${escape(c.title)} | \`${c.slug}\` | ${c.hours ?? '—'} | ${c.lessons ?? '—'} | ${price} | ${tags} |`;
    }),
    '',
    '## Fuera del listado principal (incluidos)',
    '',
    ...(unlisted.length ? unlisted.map((c) => `- ${c.title} (\`${c.slug}\`)`) : ['- Ninguno']),
    '',
    '## Legacy excluidos',
    '',
    ...(excluded.length ? excluded.map((c) => `- ${c.title} (\`${c.slug}\`)`) : ['- Ninguno']),
    '',
  ].join('\n');
}

// ---------- main ----------

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });
  const generatedAt = new Date().toISOString().slice(0, 10);

  console.log('1/6 Cursos Legacy y gratuitos…');
  const legacy = await scrapeCardLinks(`${BASE}/pages/todos-los-cursos-legacy`);
  const free = await scrapeCardLinks(`${BASE}/pages/todos-los-cursos-gratuitos`);

  console.log('2/6 Listado principal…');
  const listing = await scrapeListing();
  const excluded = listing.filter((card) => legacy.has(card.slug) || isLegacyTitle(card.title));
  for (const card of excluded) legacy.set(card.slug, card.title);
  const active = listing.filter((card) => !legacy.has(card.slug));
  console.log(`   ${listing.length} tarjetas → ${excluded.length} legacy → ${active.length} activos`);

  console.log('3/6 Detalle de cada curso…');
  const courses = [];
  for (const [index, card] of active.entries()) {
    console.log(`   [${index + 1}/${active.length}] ${card.slug}`);
    courses.push(await scrapeCourse(card.slug, card, free));
  }

  console.log('4/6 Programas y rutas oficiales…');
  const rawPrograms = await scrapePrograms();

  console.log('5/6 Cursos enlazados que no están en el listado…');
  const $home = await loadPage(`${BASE}/`);
  const homeSlugs = $home('a[href*="/courses/"]').toArray().map((anchor) => slugFromHref($home(anchor).attr('href')));
  const programSlugs = rawPrograms.flatMap((p) => p.routes.flatMap((r) => r.steps.flatMap((s) => s.courses.map((c) => c.slug))));
  const seen = new Set([...courses.map((c) => c.slug), ...legacy.keys()]);
  const queue = unique([...homeSlugs, ...programSlugs, ...courses.flatMap((c) => c.related)]).filter((slug) => slug && !seen.has(slug));
  while (queue.length) {
    const slug = queue.shift();
    if (seen.has(slug)) continue;
    seen.add(slug);
    const course = await scrapeCourse(slug, null, free);
    if (isLegacyTitle(course.title)) {
      excluded.push({ slug, title: course.title });
      continue;
    }
    console.log(`   agregado: ${slug}`);
    courses.push(course);
    queue.push(...course.related.filter((related) => !seen.has(related)));
  }

  console.log('6/6 Guardando…');
  const catalogSlugs = new Set(courses.map((c) => c.slug));
  const areas = areasBySlug(rawPrograms);
  const unlisted = courses.filter((c) => !c.in_main_listing);
  const output = courses.map(({ in_main_listing, ...course }) => ({
    ...course,
    areas: areas.get(course.slug) ?? [],
    related: course.related.filter((slug) => catalogSlugs.has(slug)),
  }));
  const programs = finalizePrograms(rawPrograms, catalogSlugs);

  await writeFile(path.join(OUT_DIR, 'courses.json'), JSON.stringify(output, null, 2) + '\n');
  await writeFile(path.join(OUT_DIR, 'programs.json'), JSON.stringify(programs, null, 2) + '\n');
  await writeFile(
    path.join(OUT_DIR, 'SUMMARY.md'),
    buildSummary({ generatedAt, listingCount: listing.length, courses: output, unlisted, excluded, programs }),
  );

  console.log(`\nListo: ${output.length} cursos, ${programs.length} programas → ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

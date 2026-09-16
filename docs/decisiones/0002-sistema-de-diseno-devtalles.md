# 0002: Sistema de diseño con la paleta de DevTalles sobre los tokens de shadcn

- **Fecha:** 2026-09-16
- **Estado:** aceptada

## Contexto

El repo seguía siendo el scaffold de `create-next-app`: `app/page.tsx` era la plantilla de Vercel, el
tema de `app/globals.css` era el neutral con `--primary` verde que dejó `shadcn init`, y solo existía un
componente en `components/ui/` (`button.tsx`). `docs/ROADMAP.md` pone "shadcn + tema + layout + landing"
en el día 1, y `docs/ENUNCIADO.md` evalúa "Interfaz de Usuario (UI): agradable y entendible" como
criterio 4. Sin tokens de marca, cada pantalla que se construyera después (quiz, ruta, dashboard) iba a
improvisar colores propios y habría que rehacerla.

Se pidió que la app se pareciera a [cursos.devtalles.com](https://cursos.devtalles.com/), reusando el
pipeline de tokens que shadcn ya trae en vez de montar un sistema paralelo.

Un antecedente interno no se podía ignorar: `docs/investigacion/opcion-c.html` ya había adoptado esa
misma paleta (violeta, lavanda, lima sobre fondo casi negro con matiz violeta) y le había dado
significado semántico a tres colores — nivel requerido / recomendado / opcional de un curso — y al lima
como marca de "esto lo generó la IA". Su `--r: 14px` coincide con el `--radius: 0.875rem` que ya tenía
`globals.css`.

## Opciones consideradas

1. **Sistema paralelo** — definir los tokens de marca en un archivo CSS aparte, fuera del pipeline de
   shadcn. Más rápido al principio, pero cualquier componente que se agregara después con
   `npx shadcn@latest add` no heredaría la marca, y el pedido explícito era evitar justamente eso.
2. **Tokens dentro de `:root` / `.dark`, registrados en el `@theme inline` existente** — la vía que
   documenta `customization.md` de la skill `shadcn` para agregar colores custom. Todo componente nuevo
   hereda la marca automáticamente porque consume los mismos nombres de variable (`--primary`,
   `--muted`, etc.) más los tokens de dominio nuevos (`--surface`, `--level-*`, `--ai`).
3. **Tema único oscuro (el de DevTalles) vs. oscuro + claro con `next-themes`** — DevTalles no tiene tema
   claro. Se evaluó fijar `class="dark"` sin toggle (más simple, menos superficie de contraste que
   revisar) contra soportar los dos temas.

## Qué dijo el abogado del diablo

No se corrió `/critica` sobre esta decisión: se discutió directamente con el usuario en modo plan,
incluyendo las alternativas de nombre de ruta, alcance y tratamiento del logo del equipo (ver
`AskUserQuestion` en la sesión). Pendiente si en el futuro se quiere una revisión adicional con
`devils-advocate`.

## Decisión

Opción 2 (tokens dentro del pipeline de shadcn) y tema claro + oscuro con `next-themes`
(`defaultTheme="dark"`), porque el usuario lo pidió explícitamente pese a que DevTalles no tiene
referencia de tema claro. Los valores del tema claro se derivaron oscureciendo cada acento en el mismo
hue hasta cruzar 4.5:1 de contraste contra su propio fondo (ver la tabla de ratios medidos en
`/sistema-diseno`, sección "Contraste").

Decisiones de detalle:

- **`--primary-bright`** (`oklch(0.6279 0.1972 283.78)` / `#7e70f9`) como token nuevo: el violeta de
  marca (`#3a14c4`) da 8.85:1 con texto encima pero solo 1.82:1 como superficie sin texto contra el
  fondo oscuro. `--primary-bright` cubre `variant="link"` y cualquier indicador sin texto.
- **`--ring`** en oscuro es la lavanda (`#c0b9fc`), no el periwinkle: el halo de foco de `button.tsx` se
  pinta a 50% de alfa, y la lavanda da 3.41:1 contra 2.14:1 del periwinkle.
- **`--accent`** se dejó como superficie de hover (el rol que ya tenía en shadcn), no como color de
  marca, para no saturar todos los menús y dropdowns.
- **`--radius` se mantiene en `0.875rem`**: coincide con el radio de las cards de DevTalles y con el
  `--r: 14px` de `opcion-c.html`.
- Los cuatro tokens de dominio (`--level-required`, `--level-recommended`, `--level-optional`, `--ai`)
  son una traducción literal de `--req` / `--rec` / `--opt` / `--vivid` de `opcion-c.html`, renombrados a
  inglés por la convención de identificadores de `CLAUDE.md`.
- Tipografía: `Space Grotesk` (headings) + `DM Sans` (cuerpo), las mismas familias de DevTalles, en
  reemplazo de `Geist` + `IBM Plex Sans` + `Source Sans 3`.
- Ruta de la galería: `/sistema-diseno` (ASCII puro, sin el route group `(dev)` que se había barajado en
  el diseño inicial — quedó plana bajo `app/sistema-diseno/` por simplicidad).

## Consecuencias

Se gana: cualquier componente que se agregue con `npx shadcn@latest add` de acá en adelante hereda la
marca sin tocarlo, y `/sistema-diseno` documenta la paleta, la tipografía, los radios, las sombras, ~22
componentes y las reglas de uso — evidencia concreta para el criterio 4 de `ENUNCIADO.md`.

Se sacrifica: mantener dos juegos de tokens (uno por tema) duplica las 45 líneas de `:root` y `.dark` en
`app/globals.css`, y el tema claro no tiene referencia real en DevTalles — es una derivación propia que
habría que revisar si el equipo decide, más adelante, que el producto es oscuro-únicamente.

Qué haría revisar esto: que el jurado o el equipo prefiera un tema único (en ese caso, sacar
`next-themes` y fijar `class="dark"` es un cambio menor); o que aparezca una nueva paleta oficial de
DevTalles que reemplace la extraída del CSS de `cursos.devtalles.com` en 2026-09-16.

# SPEC 03 — Login y logout con Discord, Google y GitHub

> **Estado:** Implementado
> **Depende de:** SPEC 02
> **Fecha:** 2026-09-20
> **Objetivo:** Login y logout de punta a punta con Discord, Google y GitHub sobre el esquema de
> la spec 02, con helpers de sesión (`requireUser`/`requireAdmin`) reusables por los specs futuros
> y el deploy en Vercel documentado paso a paso.

## Por qué existe este spec

Hoy nadie puede autenticarse: sin sesión no hay `user_id` para guardar un `assessment` (spec 06) ni
una `learning_path` (spec 07), y no hay forma de saber si quien pide `/admin` (spec 10) tiene
`role = 'admin'`. Este spec deja ese flujo completo y, sobre todo, dos piezas que los specs 06, 08,
09 y 10 van a importar sin reescribir: los helpers `requireUser()`/`requireAdmin()` y la server
action de logout.

También cierra tres decisiones que el mapa no explicita: qué mostrar entre que el login funciona y
que el dashboard real (spec 09) existe, si los tres proveedores del trigger de la spec 02 (Discord,
Google, GitHub) tienen botón ya o solo Discord, y cómo se documenta el deploy manual en Vercel dado
que hoy no hay ningún proyecto vinculado (`.vercel/` no existe en el repo). Es además el primer spec
con UI propia después de la 02: sus dos pantallas (`/login`, `/dashboard`) fijan el precedente de
que toda pantalla nueva **compone** el sistema de diseño ya construido en vez de maquetar a mano —
el concurso evalúa por dos vías a la vez (`docs/ENUNCIADO.md`, criterio 4 "UI agradable y
entendible" navegando la app desplegada, criterio 5 "código limpio" leyendo el repo público), y una
pantalla que improvisa sus propios botones pierde en las dos.

## Alcance

**Entra:**

- Página `/login` (Server Component) con tres botones — Discord, Google, GitHub — cada uno un
  `<form>` cuyo `action` es la server action `signInWithProvider` con el proveedor pre-atado vía
  `.bind()`. **No crea componentes de UI nuevos, los compone** sobre el sistema de diseño ya
  construido (ver "Composición de UI" más abajo). Si la visita ya tiene sesión (`getClaims()`
  devuelve `claims`), redirige a `/dashboard` sin mostrar el formulario. Es la única pantalla de
  login del proyecto: el botón "Entrar con Discord" que el spec 05 pondrá en la landing es un link a
  `/login`, no una copia de este formulario.
- `app/login/provider-button.tsx`: único Client Component nuevo de este spec — un wrapper delgado
  con `useFormStatus` que muestra `Spinner` dentro del `Button` mientras la server action está
  pendiente. Es composición (dos piezas ya existentes), no una pieza de diseño nueva.
- `app/auth/callback/route.ts`: route handler `GET` con `exchangeCodeForSession`, siguiendo el
  patrón oficial de Supabase (host local vs. `x-forwarded-host` detrás del proxy de Vercel),
  redirige siempre a `/dashboard` si el exchange funciona, o a `/login?error=oauth_denied` /
  `/login?error=oauth_callback_failed` si falla (ver Plan, paso 5).
- `lib/supabase/actions.ts` (`'use server'`): `signInWithProvider(provider)` y
  `signOut()`. El archivo solo exporta estas dos funciones async — un archivo `'use server'` no
  puede exportar nada más (verificado en Context7, `/vercel/next.js`); el tipo `OAuthProvider` sí
  puede vivir ahí porque se borra en compilación.
- `lib/supabase/guards.ts`: `requireUser()` y `requireAdmin()`, listos para que los specs 06, 08, 09
  y 10 los importen sin escribir su propia verificación (ver Modelo de datos).
- `app/dashboard/page.tsx`: placeholder mínimo protegido con `requireUser()` — avatar, email, badge
  con el rol, botón "Cerrar sesión" (`form action={signOut}`). El spec 09 lo reemplaza por el
  dashboard real.
- `proxy.ts`, `lib/supabase/client.ts` y `lib/supabase/server.ts` se reusan tal cual, sin editarlos.
- Verificar (no crear) que Discord, Google y GitHub ya están configurados en Supabase →
  Authentication → Providers, y que `http://localhost:3000/**` ya está en Authentication → URL
  Configuration → Redirect URLs del proyecto `gpbwuvvfffvxpkgzjqzk` — confirmado por el usuario
  antes de escribir este spec, verificado de nuevo como primer paso del plan.
- Documentar, como pasos manuales del plan (no ejecutados por el agente), el deploy en Vercel: crear
  el proyecto, vincular el repo de GitHub, cargar las env vars, y agregar el dominio resultante a
  las Redirect URLs de Supabase.

**Qué NO entra (queda para otros specs o fuera de alcance):**

- El dashboard real con rutas, XP e insignias — spec 09.
- El cuestionario y `/quiz` — spec 06.
- Cualquier route group `(app)`/`(marketing)` formal: `app/dashboard/page.tsx` queda plano en la
  raíz de `app/`, sin agrupar todavía (ver Decisiones).
- El panel `/admin` — spec 10. Este spec deja `requireAdmin()` escrito pero sin ninguna ruta real
  que lo llame.
- Componentes compartidos nuevos (`components/auth/*`, un header con sesión y avatar): cada pantalla
  de este spec compone directo sobre `components/ui/*`. El header autenticado es territorio de los
  specs 05/09, no de este (ver Decisiones).
- Un parámetro `next`/redirección post-login configurable: hoy nada lo necesita (YAGNI); `/dashboard`
  queda fijo (ver Decisiones).
- Vincular varias cuentas OAuth a un mismo usuario (un usuario que entra alguna vez con Discord y
  otra con Google): Supabase ya resuelve `auth.users` por email si el proveedor lo confirma; este
  spec no agrega UI para administrar eso.
- Crear las apps OAuth en los developer portals de Discord/Google/GitHub — ya existen.
- Ejecutar el deploy en Vercel — lo hace el usuario a mano siguiendo el plan.
- Una página de error dedicada (`/auth/auth-code-error`): se reusa `/login?error=...` con una
  alerta, para no sumar un archivo nuevo por un caso borde.
- Un Custom Access Token Hook de Supabase para exponer `profiles.role` dentro del JWT.
- Editar `.env.example`: es trabajo de entrega fuera de SDD (`docs/SPECS-MAP.md` §5), no un paso de
  este plan (ver Decisiones).

## Composición de UI

Regla de este spec (y la que deja escrita como precedente en `CLAUDE.md` para 05/06/08/09/10/12):
las dos pantallas nuevas se arman importando solo de `components/ui/*`, `components/brand/*`,
`next/image` y `@phosphor-icons/react`, sin ningún `className` que redefina color, radio o sombra
por fuera de los tokens del tema.

| Elemento                 | Qué se reusa                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cabecera de `/login`     | patrón exacto del logo de `app/page.tsx:18-20` (`bg-logo-backdrop` + `<Image src="/logo.webp">`), `Eyebrow` de `components/brand/`                               |
| Tarjeta de `/login`      | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`                                                                                              |
| Botones de proveedor     | `Button variant="outline"` los tres por igual (ningún proveedor privilegiado visualmente) + `Spinner` en estado pendiente, envueltos por `provider-button.tsx`   |
| Iconos de proveedor      | `DiscordLogoIcon` / `GoogleLogoIcon` / `GithubLogoIcon` desde `@phosphor-icons/react` (import de raíz, **no** `/ssr`: `provider-button.tsx` es Client Component) |
| Error de callback        | `Alert variant="destructive"` + `AlertTitle` + `AlertDescription` en `/login`                                                                                    |
| `/dashboard` placeholder | `Card`, `Avatar` + `AvatarImage` (con `avatar_url` del perfil) + `AvatarFallback`, `Badge` para el rol, `Button` para cerrar sesión                              |

No se extraen componentes compartidos nuevos (`components/auth/*`, un header con sesión): cada
pantalla compone directo. `app/login/provider-button.tsx` es la única excepción, y es composición
(`Button` + `Spinner` + `useFormStatus`), no una pieza de diseño nueva — sin él, los tres botones no
dan ninguna señal durante el salto al consent screen del proveedor.

## Modelo de datos

No hay tablas nuevas — reusa el esquema completo de la spec 02 (`profiles.role` y sus RLS). Lo que
este spec sí fija es la forma de los datos que van a cruzar la frontera cliente/servidor, porque los
specs 06, 08, 09 y 10 la consumen tal cual:

```ts
// lib/supabase/guards.ts
type SessionUser = {
  userId: string;
  email: string | undefined;
  username: string | null;
  avatarUrl: string | null;
  role: "user" | "admin";
};

async function requireUser(): Promise<SessionUser>;
async function requireAdmin(): Promise<SessionUser & { role: "admin" }>;
```

```ts
// lib/supabase/actions.ts
type OAuthProvider = "discord" | "google" | "github"; // type-only: se borra en compilación

async function signInWithProvider(provider: OAuthProvider): Promise<void>;
async function signOut(): Promise<void>;
```

`requireUser()` no devuelve el `JwtPayload` crudo de `getClaims()` (`claims.sub` es el `id`
compartido de `auth.users`/`profiles`; `claims.email` es opcional). Motivo: ese tipo trae un campo
`role: string` **obligatorio** que es el rol de Postgres (`authenticated`/`anon`), no
`profiles.role` (`user`/`admin`) de la app — devolver los claims tal cual invita a que un spec
futuro lea `claims.role` pensando que es el rol de la app. Por eso `requireUser()` hace `getClaims()`
(redirige a `/login` si no hay sesión) y después un único
`select username, avatar_url, role from profiles where id = claims.sub` (protegido por la RLS de
"el propio dueño" de la spec 02), y devuelve `SessionUser` — sin ningún campo `role` ambiguo.
`requireAdmin()` es `requireUser()` más un `redirect('/dashboard')` si `role !== 'admin'`.

La lista de proveedores para renderizar (id, label, ícono) no vive en `lib/supabase/actions.ts`: un
archivo `'use server'` solo puede exportar funciones async, así que esa lista se declara en
`app/login/page.tsx`.

## Plan de implementación

1. **Verificación manual, sin código:** confirmar en el dashboard de Supabase del proyecto
   `gpbwuvvfffvxpkgzjqzk` que `http://localhost:3000/**` ya está en Authentication → URL
   Configuration → Redirect URLs (junto con las tres apps OAuth, ya confirmadas). Sin esto ningún
   login local del paso 5 en adelante puede completar el ciclo. Verificación: la lista de Redirect
   URLs incluye ese patrón; si no, agregarlo antes de seguir.
2. `lib/supabase/actions.ts`: `signInWithProvider()` y `signOut()`, con el helper interno (no
   exportado) `getOrigin()` — prioridad `NEXT_PUBLIC_SITE_URL` → `NEXT_PUBLIC_VERCEL_URL` (con
   `https://` agregado si falta el esquema) → `headers()` solo en desarrollo → `localhost:3000`
   como último recurso. `NEXT_PUBLIC_SITE_URL` va primero a propósito: confiar en `headers()` antes
   que en una variable de entorno propia abre la puerta a que un `Host` manipulado influya en el
   `redirectTo` que se le pasa a Supabase. `signOut()` llama `revalidatePath('/', 'layout')` antes
   de redirigir, para que el Router Cache no muestre el dashboard viejo al volver atrás. El
   `redirect(data.url)` y el `redirect('/login?error=oauth_init_failed')` (si `signInWithOAuth`
   devuelve error) van **fuera** de cualquier `try/catch`: `redirect()` lanza una excepción
   (`NEXT_REDIRECT`) que un `catch` silenciaría, dejando el botón sin ningún efecto. Verificación:
   compila; se ejercita junto con el paso 4.
3. `app/login/provider-button.tsx`: Client Component (`useFormStatus`) que muestra `Spinner` dentro
   de `Button` mientras la acción está pendiente. Verificación: componente aislado, sin red.
4. `app/login/page.tsx`: compone `Card` + tres `<form action={signInWithProvider.bind(null,
provider)}>` con `provider-button.tsx`, lee `searchParams` (es una `Promise` en Next 16) para
   mostrar un `Alert destructive` si viene `?error=...`, y redirige a `/dashboard` si ya hay
   `claims`. Verificación: `/login` muestra los tres botones; cada uno redirige al consent screen
   del proveedor correcto con el `redirect_uri` esperado.
5. `app/auth/callback/route.ts`: `exchangeCodeForSession` con el patrón oficial (host local vs.
   `x-forwarded-host`). Si Supabase vuelve sin `code` y con `error=access_denied` (el usuario
   canceló el consent), redirige a `/login?error=oauth_denied`; si hay `code` pero el exchange
   falla, a `/login?error=oauth_callback_failed`; si funciona, a `/dashboard` fijo (sin parámetro
   `next`: nada lo necesita todavía, ver Decisiones). Verificación: completar el login de Discord en
   local deja la cookie de sesión activa (visible en devtools), aunque `/dashboard` recién se
   construye en el paso 7; cancelar el consent screen muestra el mensaje de `oauth_denied` en
   `/login`.
6. `lib/supabase/guards.ts`: `requireUser()` y `requireAdmin()` (ver Modelo de datos). Verificación:
   compila; se ejercitan de punta a punta en el paso 7.
7. `app/dashboard/page.tsx`: placeholder con `requireUser()` — `Avatar`/`AvatarFallback`, email,
   `Badge` con el rol, botón "Cerrar sesión". Cierra el ciclo completo. Verificación: logueado con
   cualquiera de los tres proveedores llegás acá y ves tus datos; sin sesión, `/dashboard` redirige a
   `/login`; "Cerrar sesión" vuelve a `/login`; promoviendo el perfil a `admin` a mano en Supabase y
   volviendo a entrar, el `Badge` cambia de `user` a `admin` (así se verifica que
   `requireUser()`/`requireAdmin()` leen `profiles.role` correctamente, de forma reproducible, sin
   depender de una ruta de prueba que no sobreviva al merge).
8. Deploy manual en Vercel (lo ejecuta el usuario, no el agente): crear el proyecto, importar el
   repo de GitHub, cargar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y
   `NEXT_PUBLIC_SITE_URL` (con el dominio real de Vercel) directo en la configuración de Vercel, y
   agregar ese mismo dominio a Supabase → Authentication → URL Configuration → Redirect URLs.
   Verificación: login con Discord de punta a punta en la URL de producción.

## Criterios de aceptación

- [x] `/login` sin sesión muestra los tres botones (Discord, Google, GitHub), todos con la misma
      variante visual.
- [x] `/login` con sesión activa redirige a `/dashboard` sin mostrar el formulario.
- [x] Completar el login con Discord en local termina en `/dashboard` con la sesión activa.
- [x] Completar el login con Google en local termina en `/dashboard` con la sesión activa.
- [x] Completar el login con GitHub en local termina en `/dashboard` con la sesión activa.
- [x] Con una cuenta que nunca inició sesión en el proyecto (o borrando su fila de `auth.users` a
      mano en Supabase antes de probar), el primer login genera su fila en `profiles` con
      `role = 'user'` (trigger de la spec 02), visible en el `Badge` de `/dashboard`.
- [x] `/dashboard` sin sesión redirige a `/login`.
- [x] El botón "Cerrar sesión" de `/dashboard` termina la sesión y redirige a `/login`.
- [x] Cancelar el consent screen de un proveedor redirige a `/login?error=oauth_denied` con un
      mensaje visible.
- [x] Un `code` inválido o expirado en `/auth/callback` redirige a
      `/login?error=oauth_callback_failed` con un mensaje visible, sin pantalla en blanco ni error 500.
- [x] Promover un perfil a `admin` a mano en Supabase y volver a entrar cambia el `Badge` de
      `/dashboard` de `user` a `admin` (verificación reproducible de que `requireUser()` lee
      `profiles.role`, no `claims.role`).
- [x] Los archivos nuevos de `/login` y `/dashboard` solo importan de `components/ui/*`,
      `components/brand/*`, `next/image` y `@phosphor-icons/react` — ningún estilo que redefina
      color, radio o sombra por fuera de los tokens del tema.
- [x] Las dos pantallas se ven correctas en tema claro y en tema oscuro.
- [x] `npm run build` y `npm run lint` pasan sin errores.
- [x] En la URL de producción de Vercel, login con Discord completa el ciclo de punta a punta
      (verificación manual del usuario, no automatizable por el agente).

## Decisiones

- **Sí:** los tres proveedores (Discord, Google, GitHub) desde este spec, con la misma variante de
  botón (`outline`) para los tres. **No:** solo Discord, ni destacar visualmente a Discord sobre los
  otros dos. El trigger de la spec 02 ya lee metadatos de los tres, las tres apps ya están
  configuradas en Supabase, y la ruta de callback es genérica — dejar solo Discord hubiera sido una
  excepción especial, no un ahorro real de trabajo; y nada en `docs/ENUNCIADO.md` (que solo exige
  Discord "al menos") justifica privilegiar un proveedor sobre otro en el diseño.
- **Sí:** `app/dashboard/page.tsx` placeholder mínimo, plano en la raíz de `app/` (sin route group
  `(app)` todavía). **No:** dejar `/dashboard` en 404 hasta el spec 09, ni crear ya el route group
  `(app)/` que sugiere `docs/ROADMAP.md`. Sin una página que mostrar no hay forma de verificar el
  flujo completo a mano; pero agrupar carpetas es una decisión de layout que le corresponde al spec
  09, que sabe qué más va a vivir ahí (quiz, paths). **Consecuencia que el spec 09 debe resolver
  explícitamente:** si crea `app/(app)/dashboard/page.tsx` sin borrar o mover este placeholder, dos
  rutas resuelven `/dashboard` y el build falla — `docs/SPECS-MAP.md` §7 deja esto anotado en la
  ficha del spec 09 (ver Cambio en ese archivo).
- **Sí:** `requireUser()`/`requireAdmin()` en `lib/supabase/guards.ts`, aplicados solo al placeholder
  de `/dashboard` por ahora. **No:** protección centralizada en `proxy.ts` con una lista de rutas
  privadas. Hoy esa lista tendría un único elemento real y temporal; sumar ese matcher obligaría a
  reescribirlo en cada spec futuro que agregue una ruta privada. El patrón por Server Component es
  el que documenta Supabase para App Router (verificado en Context7, `/websites/supabase_guides`).
- **Sí:** `requireUser()`/`requireAdmin()` devuelven un tipo propio y angosto (`SessionUser`), armado
  con un `select` sobre `profiles` (protegido por la RLS de "el propio dueño" de la spec 02). **No:**
  devolver el `JwtPayload` crudo de `getClaims()`, ni leer `role` del JWT. `JwtPayload` trae un
  `role: string` obligatorio que es el rol de Postgres, no el de la app — exponerlo tal cual es una
  trampa para cualquier spec futuro que lo consuma. Tampoco se usa un Custom Access Token Hook para
  meter `profiles.role` en el JWT: sumarlo ahora sería una config extra que ningún spec pidió
  todavía.
- **Sí:** el callback distingue dos errores (`oauth_denied` cuando el usuario cancela el consent,
  `oauth_callback_failed` para cualquier otro fallo del exchange), ambos mostrados con un `Alert`
  sobre `/login`. **No:** una página dedicada `/auth/auth-code-error`, como sugiere el ejemplo
  oficial de Supabase, ni un solo mensaje genérico para los dos casos. Distinguirlos es gratis (ya
  hay que leer `searchParams` para el caso genérico) y es mejor UX que "algo salió mal" cuando en
  realidad el usuario decidió no continuar.
- **Sí:** `/dashboard` fijo como destino post-login, sin parámetro `next`. **No:** un parámetro
  `next` configurable como el que trae el ejemplo oficial de Supabase. Hoy ningún flujo necesita
  volver a una página distinta después de loguearse; agregarlo ahora es diseñar para un caso
  hipotético (contra la propia regla de `CLAUDE.md`) y, sin validación, es superficie de open
  redirect gratis. Si un spec futuro lo necesita, lo agrega con la validación (`next.startsWith('/')`)
  en ese momento.
- **Sí:** `NEXT_PUBLIC_SITE_URL` es una variable nueva que este spec necesita, pero `.env.example` no
  se toca en este spec — se agrega en un commit de entrega aparte, directo a `master`
  (`docs/SPECS-MAP.md` §5 excluye `.env.example` de SDD). **No:** agregarla como paso del plan de
  este spec. En local, `getOrigin()` no depende de que esté seteada (cae a `headers()`/
  `localhost:3000`); en producción, se carga directo en la configuración de Vercel (paso 8).
- **Sí:** el deploy en Vercel lo ejecuta el usuario a mano; el plan documenta cada paso. **No:** que
  el agente lo corra con el CLI de Vercel durante `/spec-impl`. Crear el proyecto y cargar env vars
  son acciones sobre una cuenta externa del usuario, y hoy no hay `.vercel/` en el repo que indique
  que ya existe un proyecto vinculado.
- **Sí:** una sola server action `signInWithProvider(provider)` para los tres botones,
  atada con `.bind()`. **No:** tres server actions casi idénticas
  (`signInWithDiscord`/`signInWithGoogle`/`signInWithGithub`). Pasar argumentos con `bind` a una
  Server Function es el patrón que documenta Next.js 16 para este caso, y evita triplicar la lógica
  de `redirectTo`/`getOrigin()`.
- **Sí:** un único Client Component nuevo (`app/login/provider-button.tsx`) para el estado de carga
  de los botones. **No:** cero componentes cliente (botones inertes durante el salto al proveedor) ni
  una biblioteca de componentes de auth compartidos (`components/auth/*`). Es la mínima pieza de
  composición necesaria para que el usuario vea que el clic tuvo efecto; nada más de este spec se
  extrae como componente compartido — ese trabajo, si hace falta, es de los specs 05/09 cuando
  construyan el header con sesión.
- **Sí:** `/login` es la única pantalla de login del proyecto; el botón de la landing (spec 05) es un
  link, no una copia del formulario. **No:** que el spec 05 repita los tres `<form>` con
  `signInWithProvider`. Mantiene una sola fuente de verdad para el flujo de OAuth.

## Riesgos

| Riesgo                                                                                                                                                                             | Mitigación                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/dashboard/page.tsx` plano (sin route group) puede chocar con la estructura que arme el spec 09 — dos rutas resolviendo `/dashboard` rompen el build                           | Documentado en Decisiones y en la ficha del spec 09 en `docs/SPECS-MAP.md` §7: el 09 debe mover o borrar este placeholder explícitamente, no es opcional                                                                                                                                |
| `requireAdmin()` no tiene ninguna ruta real que lo ejercite hasta el spec 10                                                                                                       | El criterio de aceptación verifica la lectura de `profiles.role` de forma reproducible vía el `Badge` de `/dashboard` (promoviendo el perfil), no con una ruta de prueba que se borra al mergear; `requireAdmin()` se re-verifica de punta a punta cuando el spec 10 construya `/admin` |
| Alguien llama `getClaims()` directo (sin pasar por `requireUser()`) y usa `claims.role` esperando el rol de la app                                                                 | `requireUser()`/`requireAdmin()` son el único camino documentado para leer sesión; el choque de nombres queda explícito en Modelo de datos y Decisiones para quien igual necesite tocar `getClaims()`                                                                                   |
| El usuario se salta el paso manual de agregar el dominio de Vercel (paso 8) o `localhost:3000` (paso 1) a las Redirect URLs de Supabase                                            | El login falla con un error de Supabase explícito; ambos quedan como pasos separados y explícitos del plan, no agrupados al final                                                                                                                                                       |
| Los tres proveedores comparten una sola ruta de callback; si alguno necesitara lógica distinta el día de mañana (scopes, redirect post-login) el handler genérico ya no alcanzaría | Aceptado: hoy los tres flujos son idénticos (PKCE + `exchangeCodeForSession`); diferenciarlos ahora sería prematuro sin un caso real                                                                                                                                                    |

## Qué **no** entra en este spec

- El dashboard real (spec 09), el cuestionario (spec 06), el panel `/admin` (spec 10) y cualquier
  vista que use `requireUser()`/`requireAdmin()` más allá del placeholder de `/dashboard`.
- El route group `(app)`/`(marketing)` formal — lo decide el spec que primero necesite agrupar más
  de una ruta ahí.
- Componentes compartidos nuevos (`components/auth/*`, un header con sesión y avatar) — cada
  pantalla de este spec compone directo sobre `components/ui/*`.
- Un parámetro `next`/redirección post-login configurable — `/dashboard` queda fijo.
- Crear las apps OAuth de Discord/Google/GitHub o ejecutar el deploy en Vercel — pasos manuales del
  usuario, documentados en el plan pero no ejecutados por el agente.
- Vincular varias cuentas de distintos proveedores a un mismo usuario.
- Un Custom Access Token Hook para exponer `role` dentro del JWT.
- Editar `.env.example` — trabajo de entrega fuera de SDD (`docs/SPECS-MAP.md` §5).

Cada uno de estos, si aterriza, va en su propio spec.

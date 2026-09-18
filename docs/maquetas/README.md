# Maquetas visuales

Prototipos estáticos (HTML + CSS + JS, sin lógica de negocio) de cómo se vería una pantalla antes de
construirla en Next.js. Cada carpeta lleva el mismo nombre que el ADR de `docs/decisiones/` que
ilustra, y el HTML se abre directo en el navegador — no necesita build ni servidor.

El único JavaScript que llevan es de interfaz (cambiar de paso, alternar un estado, abrir un acordeón).
Ningún archivo calcula rutas, llama a una IA real ni valida datos: los textos y números que se ven son
de ejemplo, fijos en el HTML.

| Carpeta | Qué ilustra | ADR |
|---|---|---|
| [`0001-motor-de-reglas-con-ia-encima/`](0001-motor-de-reglas-con-ia-encima/0001-motor-de-reglas-con-ia-encima.html) | El cuestionario (con el campo de plazo nuevo) y la pantalla de ruta generada, con sus tres estados: cargando, personalizada con IA y sin `OPENAI_API_KEY`. | [0001](../decisiones/0001-motor-de-reglas-con-ia-encima.md) |

---
description: Somete una idea o decisión a debate adversarial antes de comprometerte con ella
argument-hint: <idea o decisión a debatir>
---

Vas a lanzar al subagente `devils-advocate` para debatir esta idea: $ARGUMENTS

El agente arranca sin ver esta conversación, así que redacta un prompt autosuficiente que incluya:
- La idea o decisión completa, tal como la entendiste (no solo la frase corta del usuario).
- Qué parte del proyecto toca (feature, arquitectura, stack, alcance, cronograma...).
- Si existe, la alternativa que se está considerando en su lugar.

No adelantes tu propia opinión sobre la idea en el prompt — el punto es que el agente llegue sin sesgo.

Cuando el agente responda:
1. Muestra su veredicto completo al usuario.
2. Pregúntale qué decide (aceptar, rechazar, ajustar según "Si aun así lo haces").
3. No escribas nada en `docs/decisiones/` todavía — eso se hace después, a mano, una vez el usuario decida, no como parte de este comando.

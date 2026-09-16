---
description: Revisa y corrige el código (legibilidad y buenas prácticas) usando el agente craft-reviewer
argument-hint: [ruta opcional]
---

Lanza al subagente `craft-reviewer` para revisar código: $ARGUMENTS

Si no se dio ninguna ruta, dile al agente que revise por defecto lo que cambió (`git diff` / diff contra `develop` o `main`). Si se dio una ruta, pásasela explícitamente como lo que debe revisar.

Cuando el agente responda, muestra su reporte completo y luego el `git diff` de lo que corrigió, para que el usuario lo apruebe antes de commitear. No commitees nada tú.

// Maqueta visual del ADR 0001 — CERO cálculo de negocio.
// Este archivo muestra/oculta bloques que ya existen en el HTML (tabs, pasos, estado de la ruta,
// acordeón de descartes) y además rellena el <select> de stack y los chips de "ya dominas" /
// "intereses" a partir de tablas fijas de abajo — mismo espíritu que docs/investigacion/opcion-c.html.
// No calcula horas, no arma rutas, no llama a ninguna IA: eso es exactamente lo que esta maqueta no
// debe hacer, porque solo sirve para ver cómo se vería la pantalla.

(function () {
  "use strict";

  /* ---------- tablas fijas: stack por meta, y chips por stack ---------- */
  // Verificadas contra data/programs.json (13 programas oficiales de DevTalles) el 2026-09-18.
  // Cada valor de stack corresponde a uno o más programas oficiales reales, no a una tecnología suelta.

  const META_STACKS = {
    frontend: [
      { value: "react", label: "React" },
      { value: "vue", label: "Vue" },
      { value: "angular", label: "Angular" },
    ],
    backend: [
      { value: "node-nest", label: "Node / Nest" },
      { value: "java", label: "Java y Spring" },
      { value: "csharp", label: "C# y .NET" },
      { value: "python", label: "Python" },
      { value: "php", label: "PHP y Laravel" },
      { value: "go", label: "Go" },
    ],
    fullstack: [
      { value: "react-nest", label: "React + Nest" },
      { value: "vue-node", label: "Vue + Node" },
      { value: "angular-nest", label: "Angular + Nest" },
      { value: "java-angular", label: "Java + Angular" },
      { value: "dotnet-blazor", label: ".NET (Blazor)" },
    ],
    movil: [
      { value: "dart", label: "Flutter / Dart" },
      { value: "react-native", label: "React Native" },
    ],
    ia: [
      { value: "ia-node", label: "IA con Node" },
      { value: "ia-python", label: "IA con Python" },
    ],
  };

  // Paso "ya dominas": tecnologías que de verdad aparecen en el programa de ese stack.
  const STACK_SKILLS = {
    react: ["JavaScript", "Git", "HTML / CSS", "TypeScript", "React", "SQL"],
    vue: ["JavaScript", "Git", "HTML / CSS", "TypeScript", "Vue", "Node"],
    angular: ["JavaScript", "Git", "HTML / CSS", "TypeScript", "Angular"],
    "node-nest": ["JavaScript", "Git", "TypeScript", "Node", "SQL"],
    java: ["Java", "Git", "SQL"],
    csharp: ["C#", "Git", "SQL"],
    python: ["Python", "Git", "SQL"],
    php: ["PHP", "Git", "SQL"],
    go: ["Go", "Git"],
    dart: ["Dart", "Git"],
    "react-native": ["JavaScript", "Git", "TypeScript", "React"],
    "react-nest": ["JavaScript", "Git", "HTML / CSS", "TypeScript", "React", "Node", "SQL"],
    "vue-node": ["JavaScript", "Git", "HTML / CSS", "TypeScript", "Vue", "Node", "SQL"],
    "angular-nest": ["JavaScript", "Git", "HTML / CSS", "TypeScript", "Angular", "Node", "SQL"],
    "java-angular": ["Java", "Angular", "TypeScript", "Git", "SQL"],
    "dotnet-blazor": ["C#", "Git", "SQL"],
    "ia-node": ["JavaScript", "Node", "Git", "Python"],
    "ia-python": ["Python", "Git", "SQL"],
  };

  // Preseleccionadas por defecto en el paso "ya dominas" (si existen para ese stack).
  const SKILLS_PRESELECTED = new Set(["JavaScript", "Git"]);

  // Paso "intereses": cada etiqueta corresponde a un curso `opcional` real del programa de ese
  // stack (nunca a uno `requerido`, porque ese ya entra sin preguntar; y `recomendado` entra por
  // defecto salvo que no quepa en el presupuesto — ver ADR 0001). Array vacío = el programa no
  // tiene ningún curso opcional: el paso se lo dice al usuario en vez de mostrar chips inertes.
  //
  // Pendiente para el motor real (no se implementa aquí — sería lógica de negocio, y este archivo
  // no calcula nada): un interés cuyo curso de respaldo coincide con una tecnología que el usuario
  // ya marcó en "ya dominas" no debería ofrecerse. Caso verificado, no hipotético: STACK_SKILLS.vue
  // incluye "Node", así que alguien puede marcar Node como dominado y el paso de intereses le sigue
  // mostrando igual el chip "Backend con Node" de abajo. Ver docs/SPECS-MAP.md §4.
  const STACK_INTERESTS = {
    react: ["Gestión de estado", "Componentes UI", "Enrutamiento con React Router", "IA aplicada", "Tiempo real / Sockets"],
    vue: ["Backend con Node"],
    angular: ["Angular clásico (con Módulos)", "IA aplicada", "Tiempo real / Sockets", "Sitios de contenido"],
    "node-nest": ["Arquitectura limpia", "Testing", "Reportes y PDFs", "IA aplicada", "Framework fullstack (Next.js)"],
    java: ["Arquitectura hexagonal"],
    csharp: ["Testing con .NET"],
    python: ["Automatización con n8n"],
    php: [],
    go: [],
    dart: ["Recursos con IA (Gemini)", "Gestión de estado (BLoC)"],
    "react-native": ["Gestión de estado", "IA aplicada (Gemini)"],
    "react-nest": ["Gestión de estado", "Componentes UI", "IA aplicada", "Testing", "Reportes y PDFs"],
    "vue-node": ["Arquitectura limpia", "Testing", "Reportes y PDFs", "IA aplicada"],
    "angular-nest": ["Angular clásico (con Módulos)", "Testing", "Reportes y PDFs", "IA aplicada"],
    "java-angular": ["Arquitectura hexagonal", "Angular clásico (con Módulos)"],
    "dotnet-blazor": ["Testing con .NET"],
    "ia-node": ["Contenedores con Docker", "Bases de datos SQL", "Integrarlo con tu frontend favorito"],
    "ia-python": ["Contenedores con Docker", "Bases de datos SQL"],
  };

  /* ---------- tabs superiores: Cuestionario / Ruta generada ---------- */

  const tabButtons = document.querySelectorAll(".tab-btn");
  const screens = document.querySelectorAll(".screen");
  const mockControls = document.getElementById("mock-controls");

  function showScreen(name) {
    screens.forEach((screen) => {
      screen.dataset.active = String(screen.id === "screen-" + name);
    });
    tabButtons.forEach((btn) => {
      btn.setAttribute("aria-selected", String(btn.dataset.tabTarget === name));
    });
    // el panel de "vista de la maqueta" solo tiene sentido sobre la pantalla de ruta
    mockControls.hidden = name !== "ruta";
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => showScreen(btn.dataset.tabTarget));
  });

  /* ---------- cuestionario: navegación entre los 6 pasos ---------- */

  const steps = Array.from(document.querySelectorAll(".step"));
  const stepBack = document.getElementById("step-back");
  const stepNext = document.getElementById("step-next");
  const stepLabel = document.getElementById("step-label");
  const stepFill = document.getElementById("step-fill");
  const stepNames = ["Meta", "Stack", "Nivel", "Ya dominas", "Intereses", "Tiempo"];

  let currentStep = 1;

  function renderStep() {
    steps.forEach((step) => {
      step.dataset.active = String(Number(step.dataset.step) === currentStep);
    });
    stepLabel.textContent = "Paso " + currentStep + " de " + steps.length + " — " + stepNames[currentStep - 1];
    stepFill.style.width = (currentStep / steps.length) * 100 + "%";
    stepBack.disabled = currentStep === 1;
    stepNext.textContent = currentStep === steps.length ? "Generar mi ruta" : "Siguiente";
  }

  stepBack.addEventListener("click", () => {
    if (currentStep > 1) {
      currentStep -= 1;
      renderStep();
    }
  });

  stepNext.addEventListener("click", () => {
    if (currentStep < steps.length) {
      currentStep += 1;
      renderStep();
    } else {
      // "Generar mi ruta": en la app real esto dispararía el motor por reglas.
      // Acá solo lleva a la pantalla que ya tiene la ruta de ejemplo dibujada.
      showScreen("ruta");
    }
  });

  renderStep();

  /* ---------- opciones de un solo valor (meta, nivel) ---------- */

  document.querySelectorAll('[role="radiogroup"]').forEach((group) => {
    group.querySelectorAll('[role="radio"]').forEach((option) => {
      option.addEventListener("click", () => {
        group.querySelectorAll('[role="radio"]').forEach((el) => el.setAttribute("aria-checked", "false"));
        option.setAttribute("aria-checked", "true");
      });
    });
  });

  /* ---------- paso 2: stack dependiente de la meta elegida en el paso 1 ---------- */

  const stackSelect = document.getElementById("stack-select");
  const metaCards = document.querySelectorAll(".option-grid [data-meta]");

  function renderStackOptions(meta) {
    const options = META_STACKS[meta] || [];
    stackSelect.innerHTML = options
      .map((opt) => '<option value="' + opt.value + '">' + opt.label + "</option>")
      .join("");
    if (options.length) {
      renderSkillsChips(options[0].value);
      renderInterestChips(options[0].value);
    }
  }

  metaCards.forEach((card) => {
    card.addEventListener("click", () => renderStackOptions(card.dataset.meta));
  });

  stackSelect.addEventListener("change", () => {
    renderSkillsChips(stackSelect.value);
    renderInterestChips(stackSelect.value);
  });

  /* ---------- paso 4 y 5: chips generados desde las tablas fijas de arriba ---------- */

  const skillsGrid = document.getElementById("skills-chip-grid");
  const interestsGrid = document.getElementById("interests-chip-grid");
  const interestsEmpty = document.getElementById("interests-empty");

  function wireChipToggles(container) {
    container.querySelectorAll(".chip-toggle").forEach((chip) => {
      chip.addEventListener("click", () => {
        const pressed = chip.getAttribute("aria-pressed") === "true";
        chip.setAttribute("aria-pressed", String(!pressed));
      });
    });
  }

  function renderSkillsChips(stack) {
    const skills = STACK_SKILLS[stack] || [];
    skillsGrid.innerHTML = skills
      .map((label) => {
        const pressed = SKILLS_PRESELECTED.has(label);
        return '<button class="chip-toggle" type="button" aria-pressed="' + pressed + '">' + label + "</button>";
      })
      .join("");
    wireChipToggles(skillsGrid);
  }

  function renderInterestChips(stack) {
    const interests = STACK_INTERESTS[stack] || [];
    interestsGrid.innerHTML = interests
      .map((label) => '<button class="chip-toggle" type="button" aria-pressed="false">' + label + "</button>")
      .join("");
    wireChipToggles(interestsGrid);
    interestsEmpty.hidden = interests.length > 0;
  }

  // Estado inicial: la meta preseleccionada en el HTML es "frontend".
  renderStackOptions("frontend");

  /* ---------- estado de la pantalla "Ruta generada" ---------- */

  const routeScreen = document.getElementById("screen-ruta");
  const routeStateButtons = document.querySelectorAll("[data-route-view]");

  routeStateButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      routeScreen.dataset.routeState = btn.dataset.routeView;
      routeStateButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    });
  });

  /* ---------- acordeón "Qué quitamos y por qué" ---------- */

  const discardToggle = document.getElementById("discard-toggle");
  const discardList = document.getElementById("discard-list");

  discardToggle.addEventListener("click", () => {
    const open = discardList.dataset.open === "true";
    discardList.dataset.open = String(!open);
    discardToggle.setAttribute("aria-expanded", String(!open));
  });
})();

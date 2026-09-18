// Maqueta visual del ADR 0001 — CERO lógica de negocio.
// Todo lo que hace este archivo es mostrar/ocultar bloques que ya existen en el HTML.
// No calcula horas, no arma rutas, no llama a ninguna IA: eso es exactamente lo que
// esta maqueta no debe hacer, porque solo sirve para ver cómo se vería la pantalla.

(function () {
  "use strict";

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

  /* ---------- cuestionario: navegación entre los 4 pasos ---------- */

  const steps = Array.from(document.querySelectorAll(".step"));
  const stepBack = document.getElementById("step-back");
  const stepNext = document.getElementById("step-next");
  const stepLabel = document.getElementById("step-label");
  const stepFill = document.getElementById("step-fill");
  const stepNames = ["Meta", "Nivel", "Intereses", "Tiempo"];

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

  /* ---------- opciones de un solo valor (meta profesional) ---------- */

  document.querySelectorAll('[role="radiogroup"]').forEach((group) => {
    group.querySelectorAll('[role="radio"]').forEach((option) => {
      option.addEventListener("click", () => {
        group.querySelectorAll('[role="radio"]').forEach((el) => el.setAttribute("aria-checked", "false"));
        option.setAttribute("aria-checked", "true");
      });
    });
  });

  /* ---------- chips de selección múltiple (tecnologías, intereses) ---------- */

  document.querySelectorAll(".chip-toggle").forEach((chip) => {
    chip.addEventListener("click", () => {
      const pressed = chip.getAttribute("aria-pressed") === "true";
      chip.setAttribute("aria-pressed", String(!pressed));
    });
  });

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

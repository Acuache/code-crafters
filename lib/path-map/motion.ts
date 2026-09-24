// Coreografía del mapa al marcar un paso como hecho (spec 12). Todo en ms y medido desde el
// cambio de estado; con prefers-reduced-motion no corre nada de esto y el cambio es instantáneo.
//
//   0 ms      el modal se cierra y el nodo hace "pop" (--animate-step-pop, 400 ms)
//   250 ms    el tramo del camino se rellena, la mascota viaja y la página la acompaña
//   850 ms    el halo y el globo aparecen en el próximo nodo
//
// El tramo, la mascota y el scroll arrancan juntos para que se lean como un solo movimiento: el
// progreso "viaja" del paso hecho al siguiente.

export const FOLLOW_DELAY_MS = 250;
export const TRAVEL_DURATION_MS = 600;
export const ARRIVAL_DELAY_MS = FOLLOW_DELAY_MS + TRAVEL_DURATION_MS;

// Coreografía del mapa al marcar un paso como hecho, en ms desde el cambio de estado (con
// prefers-reduced-motion el cambio es instantáneo):
//
//   0 ms      el modal se cierra y el nodo hace "pop"
//   250 ms    el tramo se rellena, la mascota viaja y la página la acompaña
//   850 ms    el halo y el globo aparecen en el próximo nodo

export const FOLLOW_DELAY_MS = 250;
export const TRAVEL_DURATION_MS = 600;
export const ARRIVAL_DELAY_MS = FOLLOW_DELAY_MS + TRAVEL_DURATION_MS;

// Lo que devuelve una server action que puede fallar. `message` ya está listo para mostrarse: nunca
// lleva el texto crudo de Postgres ni de la IA.
export type ActionFailure = { ok: false; message: string };

export type ActionResult = { ok: true } | ActionFailure;

export type ActionResultWithData<Data> = { ok: true; data: Data } | ActionFailure;

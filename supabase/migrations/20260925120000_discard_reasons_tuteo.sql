-- La app pasa a tutear al usuario. discard_reason se muestra tal cual en "Qué quitamos y por qué",
-- y restoreStep filtra por el motivo exacto del descarte manual (USER_DISCARD_REASON en
-- lib/progress/path-progress.ts): sin esta migración, los pasos ya quitados no se podrían restaurar.

update public.path_steps
set discard_reason = 'lo quitaste tú'
where discard_reason = 'lo quitaste vos';

update public.path_steps
set discard_reason = 'ya lo dominas'
where discard_reason = 'ya lo dominás';

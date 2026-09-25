-- SPEC 15 (specs/15-path-sharing.md): compartir una ruta con un link /r/[slug] y copiarla a otra
-- cuenta. Las RLS no cambian: lo que lee o copia una ruta ajena pasa por estas tres funciones.

-- 1. El default es volátil: cada fila existente recibe su propio slug al agregar la columna.
alter table public.learning_paths
  add column is_public boolean not null default false,
  add column share_slug text not null unique
    default encode(extensions.gen_random_bytes(8), 'hex'),
  add column copied_from_path_id uuid
    references public.learning_paths (id) on delete set null;

create index learning_paths_copied_from_path_id_idx
  on public.learning_paths (copied_from_path_id);

-- Una sola copia por usuario y ruta de origen.
create unique index learning_paths_one_copy_per_user_idx
  on public.learning_paths (user_id, copied_from_path_id)
  where copied_from_path_id is not null;

-- 2. La ruta pública por su slug, sin progreso ni ids ajenos. null si no existe o es privada.
create function public.get_shared_path(p_slug text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_viewer_id uuid := (select auth.uid());
  v_path public.learning_paths%rowtype;
  v_author_username text;
  v_author_avatar_url text;
  v_own_path_id uuid;
  v_steps jsonb;
begin
  select * into v_path
  from public.learning_paths
  where share_slug = p_slug and is_public;

  if not found then
    return null;
  end if;

  select username, avatar_url into v_author_username, v_author_avatar_url
  from public.profiles
  where id = v_path.user_id;

  if v_viewer_id = v_path.user_id then
    v_own_path_id := v_path.id;
  elsif v_viewer_id is not null then
    select id into v_own_path_id
    from public.learning_paths
    where user_id = v_viewer_id and copied_from_path_id = v_path.id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'courseId', courses.id,
        'stage', path_steps.stage,
        'position', path_steps.position,
        'origin', path_steps.origin,
        'reason', coalesce(path_steps.ai_reason, path_steps.reason),
        'courseTitle', courses.title,
        'courseHours', courses.hours,
        'courseUrl', courses.url,
        'courseImageUrl', courses.image_url,
        'programSlug', programs.slug,
        'programName', programs.name
      )
      order by path_steps.stage, path_steps.position
    ),
    '[]'::jsonb
  ) into v_steps
  from public.path_steps
  join public.courses on courses.id = path_steps.course_id
  left join public.programs on programs.id = path_steps.source_program_id
  where path_steps.path_id = v_path.id
    and path_steps.status <> 'discarded';

  return jsonb_build_object(
    'title', coalesce(v_path.ai_title, v_path.title),
    'summary', coalesce(v_path.ai_summary, v_path.summary),
    'budgetHours', v_path.budget_hours,
    'isPersonalized', v_path.personalized_at is not null,
    'author', jsonb_build_object('username', v_author_username, 'avatarUrl', v_author_avatar_url),
    'viewer', jsonb_build_object(
      'isOwner', v_viewer_id is not null and v_viewer_id = v_path.user_id,
      'ownPathId', v_own_path_id
    ),
    'steps', v_steps
  );
end;
$$;

revoke execute on function public.get_shared_path(text) from public;
grant execute on function public.get_shared_path(text) to anon, authenticated;

-- 3. Copia la ruta pública a la cuenta de quien llama, con el progreso en cero. Idempotente: al
--    dueño le devuelve su ruta y a quien ya la copió, su copia.
create function public.copy_shared_path(p_slug text)
returns uuid
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_original public.learning_paths%rowtype;
  v_copy_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select * into v_original
  from public.learning_paths
  where share_slug = p_slug and is_public;

  if not found then
    raise exception 'Ruta no disponible' using errcode = 'P0002';
  end if;

  if v_original.user_id = v_user_id then
    return v_original.id;
  end if;

  select id into v_copy_id
  from public.learning_paths
  where user_id = v_user_id and copied_from_path_id = v_original.id;

  if found then
    return v_copy_id;
  end if;

  begin
    insert into public.learning_paths (
      user_id, title, goal, summary, budget_hours,
      ai_title, ai_summary, personalized_at, copied_from_path_id
    ) values (
      v_user_id, v_original.title, v_original.goal, v_original.summary, v_original.budget_hours,
      v_original.ai_title, v_original.ai_summary, v_original.personalized_at, v_original.id
    )
    returning id into v_copy_id;
  exception when unique_violation then
    -- Otra pestaña ganó la carrera: se devuelve su copia.
    select id into v_copy_id
    from public.learning_paths
    where user_id = v_user_id and copied_from_path_id = v_original.id;

    if not found then
      raise;
    end if;

    return v_copy_id;
  end;

  insert into public.path_steps (
    path_id, course_id, source_program_id, stage, position,
    origin, reason, ai_reason, status, discard_reason
  )
  select
    v_copy_id, course_id, source_program_id, stage, position,
    origin, reason, ai_reason,
    case
      when status = 'discarded' then 'discarded'::public.path_step_status
      else 'pending'::public.path_step_status
    end,
    case when status = 'discarded' then discard_reason end
  from public.path_steps
  where path_id = v_original.id;

  return v_copy_id;
end;
$$;

revoke execute on function public.copy_shared_path(text) from public, anon;
grant execute on function public.copy_shared_path(text) to authenticated;

-- 4. El username del autor del original, solo para el dueño de la copia. null si el original ya
--    no existe o la ruta no es una copia.
create function public.get_path_origin(p_path_id uuid)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select profiles.username
  from public.learning_paths as copied_path
  join public.learning_paths as original_path
    on original_path.id = copied_path.copied_from_path_id
  join public.profiles on profiles.id = original_path.user_id
  where copied_path.id = p_path_id
    and copied_path.user_id = (select auth.uid());
$$;

revoke execute on function public.get_path_origin(uuid) from public, anon;
grant execute on function public.get_path_origin(uuid) to authenticated;

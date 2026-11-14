-- ORDEN: aplicar INMEDIATAMENTE después de desplegar el frontend nuevo (que sube
-- avatares a rutas {uid}/...). Mientras no se aplique, siguen activas las
-- políticas abiertas de la plantilla. Este archivo no se ejecuta solo.
--
-- ANTES de aplicar, revisar las políticas existentes y borrar cualquier otra
-- política permisiva sobre estas tablas (las permisivas se combinan con OR):
--   select policyname, cmd, roles, qual from pg_policies
--   where tablename in ('objects', 'profiles');
--
-- El bucket 'avatars' es público: las URLs /object/public/... se sirven sin
-- política SELECT, por eso no se crea una (evita listar las carpetas {uid}).

update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/png','image/jpeg']
where id = 'avatars';

drop policy if exists "Avatar images are publicly accessible." on storage.objects;
drop policy if exists "Anyone can upload an avatar." on storage.objects;
drop policy if exists "Anyone can update an avatar." on storage.objects;
drop policy if exists avatars_public_read on storage.objects;
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;

create policy avatars_insert_own on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_update_own on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete_own on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.profiles enable row level security;
-- Políticas de la plantilla "User Management Starter" (la de SELECT es pública)
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own on public.profiles
for select to authenticated using (auth.uid() = id);

create policy profiles_insert_own on public.profiles
for insert to authenticated with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Verificación posterior a la aplicación manual:
-- select * from pg_policies where tablename in ('objects','profiles');

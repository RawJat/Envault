-- Project-level UI behavior and default environment selector

alter table projects
add column if not exists ui_mode text not null default 'simple';

alter table projects
add column if not exists default_environment_slug text not null default 'development';

alter table projects
  drop constraint if exists projects_ui_mode_check;

alter table projects
  add constraint projects_ui_mode_check
  check (ui_mode in ('simple', 'advanced'));

update projects
set ui_mode = coalesce(ui_mode, 'simple')
where ui_mode is null;

update projects
set default_environment_slug = coalesce(default_environment_slug, 'development')
where default_environment_slug is null;

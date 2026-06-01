-- Add courts_worked_with to coaches: stores IDs from the LAGOS_COURTS constant
alter table coaches
  add column if not exists courts_worked_with text[] not null default '{}';

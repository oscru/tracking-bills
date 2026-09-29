-- A goal's deadline is now optional — some savings goals don't have a firm
-- date (e.g. a general emergency fund). The savings-pace suggestion/"you
-- might not make it" warning in the app only applies when a deadline is set.

alter table public.goals alter column deadline drop not null;

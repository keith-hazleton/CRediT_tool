-- Add structured name fields to authors
ALTER TABLE authors ADD COLUMN first_name TEXT NOT NULL DEFAULT '';
ALTER TABLE authors ADD COLUMN last_name TEXT NOT NULL DEFAULT '';
ALTER TABLE authors ADD COLUMN middle_initial TEXT NOT NULL DEFAULT '';

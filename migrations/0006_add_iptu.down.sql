-- Remove IPTU column from prospecting_properties table
ALTER TABLE prospecting_properties DROP COLUMN IF EXISTS iptu;

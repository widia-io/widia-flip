-- Add IPTU column to prospecting_properties table
ALTER TABLE prospecting_properties ADD COLUMN IF NOT EXISTS iptu numeric;

-- Make radius_meters nullable to support polygon zones
ALTER TABLE zones MODIFY COLUMN radius_meters INT NULL;

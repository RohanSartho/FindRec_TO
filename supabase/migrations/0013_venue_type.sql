-- Add venue_type to locations to track indoor/outdoor status for non-rink venues
-- Priority: Indoor Pool > Outdoor Pool/Wading > indoor facilities (gym, weight room, etc.)

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS venue_type TEXT
    CHECK (venue_type IN ('indoor', 'outdoor'));

-- 0027_dropin_alerts_add_time.sql
-- Adds alert_start_time and alert_end_time to user_dropin_alerts so users can
-- track a specific time slot at a venue (e.g. "Lane Swim 7:30–9:30 at Timbrell"),
-- not just any session with that course_title at that location.
--
-- Existing rows get '' for both columns — they remain visible on the dashboard
-- but the results-table bell will no longer match them (expected, users recreate).

ALTER TABLE user_dropin_alerts
  ADD COLUMN alert_start_time text NOT NULL DEFAULT '',
  ADD COLUMN alert_end_time   text NOT NULL DEFAULT '';

-- Replace old unique index (course_title only) with one that includes the time slot.
-- Two alerts for the same venue+activity but different times are now allowed.
DROP INDEX user_dropin_alerts_unique;
CREATE UNIQUE INDEX user_dropin_alerts_unique
  ON user_dropin_alerts (user_id, location_id, course_title, alert_start_time, alert_end_time);

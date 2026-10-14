-- Demo data prep (local e2e database only): make the seeded jobs start today so the job editor accepts edits.
UPDATE jobs SET post_from = CURRENT_DATE WHERE post_from < CURRENT_DATE;
UPDATE jobs SET post_to = CURRENT_DATE + 60 WHERE post_to < CURRENT_DATE + 30;
INSERT INTO job_locations (job_id, city, country, created_at, updated_at)
SELECT j.id, 'Lahore', 'Pakistan', EXTRACT(EPOCH FROM now())::bigint, EXTRACT(EPOCH FROM now())::bigint
FROM jobs j WHERE NOT EXISTS (SELECT 1 FROM job_locations l WHERE l.job_id = j.id);

-- "The interview day arrives": move every booked screening slot to ~1 hour ago (local demo database only).
UPDATE interview_slot SET "startsAt" = now() - interval '45 minutes', "endsAt" = now() - interval '15 minutes'
WHERE id IN (SELECT slot_id FROM slot_booking WHERE status = 'RESERVED');

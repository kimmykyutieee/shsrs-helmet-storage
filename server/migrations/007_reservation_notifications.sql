USE shsrs;

ALTER TABLE payments
  ADD COLUMN rejection_reason VARCHAR(500) NULL AFTER processed_at;

ALTER TABLE notifications
  MODIFY COLUMN type VARCHAR(64) NOT NULL,
  ADD COLUMN event_key VARCHAR(191) NULL AFTER type;

UPDATE notifications
SET event_key = CASE
  WHEN type='RESERVATION_STARTING' AND reservation_id IS NOT NULL
    THEN CONCAT('reservation:', reservation_id, ':starting-reminder')
  WHEN type='RESERVATION_ENDING' AND reservation_id IS NOT NULL
    THEN CONCAT('reservation:', reservation_id, ':ending-reminder')
  ELSE CONCAT('legacy:', id)
END
WHERE event_key IS NULL;

ALTER TABLE notifications
  MODIFY COLUMN event_key VARCHAR(191) NOT NULL,
  DROP INDEX uq_notification_reservation_type,
  ADD UNIQUE KEY uq_notification_event_key (event_key);

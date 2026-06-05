-- apps/backend/migrations/20260605160000_high_alert_webhook_trigger.sql

CREATE OR REPLACE FUNCTION enqueue_high_alert_webhook()
RETURNS TRIGGER AS $$
BEGIN
    IF LOWER(NEW.severity) = 'high' THEN
        INSERT INTO webhook_delivery_queue (payload, status)
        VALUES (
            jsonb_build_object(
                'event_type', 'alert.high_severity',
                'data', jsonb_build_object(
                    'alert_id', NEW.id,
                    'project_id', NEW.project_id,
                    'message', NEW.message,
                    'severity', NEW.severity,
                    'created_at', NEW.created_at
                )
            ),
            'PENDING'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_enqueue_high_alert_webhook
AFTER INSERT ON alerts
FOR EACH ROW
EXECUTE FUNCTION enqueue_high_alert_webhook();

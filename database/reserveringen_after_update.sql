CREATE TRIGGER `reserveringen_after_update` AFTER UPDATE ON `reserveringen`
 FOR EACH ROW BEGIN
    IF NEW.wachtlijst <> OLD.wachtlijst OR NEW.uitvoering_id <> OLD.uitvoering_id THEN
        CALL update_counts(NEW.uitvoering_id);
    END IF;
    IF NEW.uitvoering_id <> OLD.uitvoering_id THEN
        CALL update_counts(OLD.uitvoering_id);
    END IF;

END
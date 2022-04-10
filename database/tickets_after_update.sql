CREATE TRIGGER `tickets_after_update` AFTER UPDATE ON `tickets`
 FOR EACH ROW BEGIN
    CALL update_counts(( SELECT MAX(uitvoering_id) FROM reserveringen WHERE id=NEW.reservering_id ));
END
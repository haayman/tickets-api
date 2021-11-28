CREATE TRIGGER `tickets_after_delete` AFTER DELETE ON `tickets`
 FOR EACH ROW BEGIN
    CALL update_counts(( SELECT MAX( uitvoering_id) FROM reserveringen WHERE id=OLD.reservering_id ));
END

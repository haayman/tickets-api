CREATE TRIGGER `tickets_after_insert` AFTER INSERT ON `tickets`
 FOR EACH ROW BEGIN
    CALL update_counts(( SELECT MAX(uitvoering_id) FROM reserveringen WHERE id=NEW.reservering_id ));
END
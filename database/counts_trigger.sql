DROP PROCEDURE IF EXISTS update_counts;
DELIMITER //
CREATE PROCEDURE update_counts(
    IN V_uitvoering_id int
)
BEGIN
    DECLARE V_tekoop, V_gereserveerd, V_wachtlijst int;
    
    SET @reserveringen := (SELECT id from reserveringen where uitvoering_id = V_uitvoering_id);
    SET @wachtlijst := (SELECT id from reserveringen where uitvoering_id = V_uitvoering_id AND wachtlijst);
    SET @notwachtlijst := (SELECT id from reserveringen where uitvoering_id = V_uitvoering_id AND NOT wachtlijst);
    SET V_tekoop = (
        SELECT count(*) 
        FROM tickets t 
        WHERE t.tekoop AND NOT t.geannuleerd AND NOT t.verkocht AND t.reservering_id IN (@notwachtlijst));

    SET V_gereserveerd =  (
        SELECT count(*) 
        FROM tickets t 
        WHERE NOT t.geannuleerd AND NOT t.verkocht AND t.reservering_id IN (@reserveringen));

    SET V_wachtlijst = (
        SELECT count(*) FROM tickets t WHERE NOT t.geannuleerd AND NOT t.verkocht AND t.reservering_id IN (@wachtlijst));

    update uitvoeringen 
        set te_koop = V_tekoop,       
            gereserveerd =  V_gereserveerd, 
            wachtlijst =  V_wachtlijst
        WHERE id=V_uitvoering_id; 
END 

CREATE TRIGGER `tickets_after_update` AFTER UPDATE ON `tickets`
 FOR EACH ROW BEGIN
    CALL update_counts(( SELECT uitvoering_id FROM reserveringen WHERE id=NEW.reservering_id ));
END

CREATE TRIGGER `tickets_after_insert` AFTER INSERT ON `tickets`
 FOR EACH ROW BEGIN
    CALL update_counts(( SELECT uitvoering_id FROM reserveringen WHERE id=NEW.reservering_id ));
END

CREATE TRIGGER `tickets_after_delete` AFTER DELETE ON `tickets`
 FOR EACH ROW BEGIN
    CALL update_counts(( SELECT uitvoering_id FROM reserveringen WHERE id=OLD.reservering_id ));
END

CREATE TRIGGER `uitvoering_before_insert` BEFORE INSERT ON `uitvoeringen`
 FOR EACH ROW BEGIN
    SET NEW.vrije_plaatsen = NEW.aantal_plaatsen;
END

CREATE TRIGGER `uitvoering_before_update` BEFORE UPDATE ON `uitvoeringen`
 FOR EACH ROW BEGIN
    SET NEW.vrije_plaatsen = NEW.aantal_plaatsen - NEW.gereserveerd + NEW.te_koop;
    IF NEW.vrije_plaatsen < 0 THEN
        SIGNAL SQLSTATE '04500' SET MESSAGE_TEXT = 'aantal vrije plaatsen < 0';
    END IF;
END


DELIMITER ;
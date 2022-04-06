DELIMITER $$
CREATE DEFINER=`phpmyadmin`@`localhost` PROCEDURE `update_counts`(IN `V_uitvoering_id` INT)
BEGIN
    DECLARE V_tekoop, V_gereserveerd, V_wachtlijst int;
    
    SET V_tekoop = (
        SELECT count(*) 
        FROM tickets t 
        WHERE t.tekoop 
            AND NOT t.geannuleerd 
            AND NOT t.verkocht 
            AND t.reservering_id IN (
                SELECT id from reserveringen where uitvoering_id = V_uitvoering_id AND NOT wachtlijst));

    SET V_gereserveerd =  (
        SELECT count(*) 
        FROM tickets t 
        WHERE 
            NOT t.geannuleerd 
            AND NOT t.verkocht 
            AND NOT t.saldo > 0
            AND t.reservering_id IN (
            SELECT id from reserveringen where uitvoering_id = V_uitvoering_id AND NOT wachtlijst));

    SET V_wachtlijst = (
        SELECT count(*) FROM tickets t WHERE 
            NOT t.geannuleerd 
            AND NOT t.verkocht 
            AND t.reservering_id IN (
                SELECT id from reserveringen where uitvoering_id = V_uitvoering_id AND wachtlijst));

    update uitvoeringen 
        set te_koop = V_tekoop,       
            gereserveerd =  V_gereserveerd, 
            wachtlijst =  V_wachtlijst
        WHERE id=V_uitvoering_id; 
END$$
DELIMITER ;
  ALTER TABLE uitvoeringen  
    ADD COLUMN IF NOT EXISTS gereserveerd INT NOT NULL DEFAULT '0'  AFTER aanvang,  
    ADD COLUMN IF NOT EXISTS wachtlijst INT NOT NULL DEFAULT '0'  AFTER gereserveerd,  
    ADD COLUMN IF NOT EXISTS te_koop INT NOT NULL DEFAULT '0'  AFTER wachtlijst,  
    ADD COLUMN IF NOT EXISTS vrije_plaatsen INT NOT NULL DEFAULT '0'  AFTER te_koop;

DELIMITER //
CREATE OR REPLACE TRIGGER update_counts_trigger AFTER INSERT OR UPDATE OR DELETE ON tickets
FOR EACH ROW
BEGIN
    DECLARE V_uitvoeringId, V_ReserveringId varchar(50);
    DECLARE V_tekoop, V_gereserveerd, V_wachtlijst int;
    
    SET V_ReserveringId = NEW.reserveringId OR OLD.reserveringId;
    SET V_uitvoeringId = ( SELECT uitvoeringId FROM reservering WHERE id=V_ReserveringId )
    SET V_tekoop = (
        SELECT count(*) 
        FROM tickets t 
        WHERE t.tekoop AND NOT t.geannuleerd AND NOT t.verkocht AND t.uitvoeringId = V_uitvoeringId);

    SET V_gereserveerd =  (
        SELECT count(*) 
        FROM tickets t 
        WHERE NOT t.wachtlijst AND NOT t.geannuleerd AND NOT t.verkocht AND t.uitvoeringId = V_uitvoeringId);

    SET V_wachtlijst = (
        SELECT count(*) FROM tickets t WHERE t.wachtlijst AND NOT t.geannuleerd AND NOT t.verkocht AND t.uitvoeringId = V_uitvoeringId);

    update uitvoering 
        set tekoop = V_tekoop,       
            gereserveerd =  V_gereserveerd, 
            wachtlijst =  V_wachtlijst,
            vrije_plaatsen = aantal_plaatsen - V_gereserveerd + V_tekoop  
        WHERE id=V_uitvoeringId; 
END //
DELIMITER ;


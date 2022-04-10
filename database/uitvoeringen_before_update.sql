CREATE TRIGGER `uitvoeringen_before_update` BEFORE UPDATE ON `uitvoeringen`
 FOR EACH ROW BEGIN
    SET NEW.vrije_plaatsen = NEW.aantal_plaatsen - NEW.gereserveerd + NEW.te_koop;
#    IF NEW.vrije_plaatsen < 0 THEN
#        SIGNAL SQLSTATE '04500' SET MESSAGE_TEXT = 'aantal vrije plaatsen < 0';
#    END IF;
END
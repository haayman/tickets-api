CREATE TRIGGER `uitvoeringen_before_insert` BEFORE INSERT ON `uitvoeringen`
 FOR EACH ROW BEGIN
    SET NEW.vrije_plaatsen = NEW.aantal_plaatsen;
END
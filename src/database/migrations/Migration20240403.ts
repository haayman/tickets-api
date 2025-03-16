import { Migration } from '@mikro-orm/migrations';

export class Migration20240403 extends Migration {
  async up(): Promise<void> {
    // Eerst de stored procedure maken
    await this.addSql(`
      CREATE PROCEDURE update_counts(IN V_uitvoering_id INT)
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
      END
    `);

    // Reserveringen trigger
    await this.addSql(`
      CREATE TRIGGER reserveringen_after_update AFTER UPDATE ON reserveringen
      FOR EACH ROW BEGIN
        IF NEW.wachtlijst <> OLD.wachtlijst OR NEW.uitvoering_id <> OLD.uitvoering_id THEN
          CALL update_counts(NEW.uitvoering_id);
        END IF;
        IF NEW.uitvoering_id <> OLD.uitvoering_id THEN
          CALL update_counts(OLD.uitvoering_id);
        END IF;
      END
    `);

    // Tickets triggers
    await this.addSql(`
      CREATE TRIGGER tickets_after_delete AFTER DELETE ON tickets
      FOR EACH ROW BEGIN
        CALL update_counts(( SELECT MAX( uitvoering_id) FROM reserveringen WHERE id=OLD.reservering_id ));
      END
    `);

    await this.addSql(`
      CREATE TRIGGER tickets_after_insert AFTER INSERT ON tickets
      FOR EACH ROW BEGIN
        CALL update_counts(( SELECT MAX(uitvoering_id) FROM reserveringen WHERE id=NEW.reservering_id ));
      END
    `);

    await this.addSql(`
      CREATE TRIGGER tickets_after_update AFTER UPDATE ON tickets
      FOR EACH ROW BEGIN
        CALL update_counts(( SELECT MAX(uitvoering_id) FROM reserveringen WHERE id=NEW.reservering_id ));
      END
    `);

    // Uitvoeringen triggers
    await this.addSql(`
      CREATE TRIGGER uitvoeringen_before_insert BEFORE INSERT ON uitvoeringen
      FOR EACH ROW BEGIN
        SET NEW.vrije_plaatsen = NEW.aantal_plaatsen;
      END
    `);

    await this.addSql(`
      CREATE TRIGGER uitvoeringen_before_update BEFORE UPDATE ON uitvoeringen
      FOR EACH ROW BEGIN
        SET NEW.vrije_plaatsen = NEW.aantal_plaatsen - NEW.gereserveerd + NEW.te_koop;
      END
    `);
  }

  async down(): Promise<void> {
    // Verwijder de triggers
    await this.addSql('DROP TRIGGER IF EXISTS reserveringen_after_update');
    await this.addSql('DROP TRIGGER IF EXISTS tickets_after_delete');
    await this.addSql('DROP TRIGGER IF EXISTS tickets_after_insert');
    await this.addSql('DROP TRIGGER IF EXISTS tickets_after_update');
    await this.addSql('DROP TRIGGER IF EXISTS uitvoeringen_before_insert');
    await this.addSql('DROP TRIGGER IF EXISTS uitvoeringen_before_update');

    // Verwijder de stored procedure
    await this.addSql('DROP PROCEDURE IF EXISTS update_counts');
  }
} 

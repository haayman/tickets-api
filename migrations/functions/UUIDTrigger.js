module.exports = table => `
		CREATE TRIGGER ${table}_before_insert
		BEFORE INSERT ON ${table}
		FOR EACH ROW
		BEGIN
			IF new.id IS NULL THEN
				SET new.id = uuid();
			END IF;
		END
	`

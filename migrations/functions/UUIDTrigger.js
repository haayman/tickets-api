module.exports = table => `
		CREATE TRIGGER ${table}_before_insert
		BEFORE INSERT ON ${table}
		FOR EACH ROW
		SET new.id = uuid();
	`

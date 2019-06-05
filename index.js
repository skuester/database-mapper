const Database = require('./lib/database')


module.exports = function DatabaseMapper(knex) {
	return new Database(knex)
}
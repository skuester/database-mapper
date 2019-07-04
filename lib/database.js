const _ = require('lodash')

const Table = require('./table')
const Query = require('./query')



function Database(knex) {
	var TABLES = {}


	function DB(table_name) {
		return new Query(knex, get_table(table_name))
	}


	function get_table(table_name) {
		if (!TABLES[table_name]) throw new Error(`No table defined for ${table_name}`)
		return TABLES[table_name]
	}


	function define_table(name, config = {}) {
		config.name = name
		config.get_table = get_table
		TABLES[name] = new Table(config)
	}


	DB.knex = knex
	DB.destroy = knex.destroy.bind(knex)
	DB.raw = knex.raw.bind(knex)
	DB.table = define_table


	return DB
}



module.exports = Database

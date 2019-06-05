const _ = require('lodash')

const { Query } = require('./query')
const { DbTablePrototype } = require('./db-table-prototype')
const { DataView } = require('./extras/data-view')
const Table = require('./table')

const { map_result_aliases } = require('./utils')



function Database(knex) {
	var TABLES = {}


	function DB(table_name, opts) {
		if (!TABLES[table_name]) throw new Error(`No table defined for ${table_name}`)
		return TABLES[table_name]
	}


	DB.knex = knex


	DB.close = () => knex.destroy()


	DB.subquery = function (query) {
		return knex.raw(`(${query})`)
	}


	DB.table = function (name, table_config = {}) {
		// normalize
		table_config.name = name
		// define
		TABLES[name] = new Table(DB, table_config)
	}


	DB.raw = knex.raw.bind(knex)


	DB.DataView = (opts) => DataView(DB, opts)


	// return a query function from a pre-compiled template object, and an optional mapper
	DB.get_query_fn = function (aot_template, result_mapper) {
		var to_result = result_mapper ? (row) => result_mapper.read(row) : _.identity

		return function(bindings, write_to_log = false) {
			let q = knex
				.raw(aot_template.sql_template, layer_bindings(bindings, aot_template.bindings))
				.options({nestTables: true})

			if (write_to_log) console.log('ms-db: query runner SQL >', q.toString())

				// in this case, then() returns [result, fields]
			return q.then((mysql_output) => {
					return mysql_output[0].map(row => to_result(map_result_aliases(row, aot_template.table_alias_map)))
				})
		}
	}


	// NOTE: returns MULTIPLE queries - allows for source trees with multiple top-level tables!
	DB.SourceTreeQuery = function (source_tree, block_fn) {
		let join_type = 'leftJoin'

		let tables = {}

		_.forEach(source_tree.from, function (table_sources, name) {
			let table = tables[name] = DB(name)

			if (!tables.$first) tables.$first = table

			table.select(...table_sources.fields)

			_.forEach(table_sources.from, (related_table_sources, relation_name) => {
				build_relation(table, relation_name, related_table_sources, join_type)
			})
		})

		if (!tables.$first) throw new Error('No primary table listed in source tree!')

		if (block_fn) block_fn(tables)

		return tables
	}

	return DB
}





function build_relation(parent_table, name, sources, join_type = 'leftJoin') {
	parent_table[join_type](name, function (other_table) {
		if (sources.fields) {
			other_table.select(...sources.fields)
		}

		_.forEach(sources.from, (related_sources, related_name) => {
			build_relation(other_table, related_name, related_sources, join_type)
		})
	})
}



function layer_bindings(user_bindings, template_bindings) {
	return template_bindings.map((value, i) => (i in user_bindings) ? user_bindings[i] : value)
}




module.exports = Database

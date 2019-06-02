const _ = require('lodash')


function SourceTreeQuery (Database, source_tree, block_fn) {
	let join_type = 'leftJoin'

	let tables = {}

	_.forEach(source_tree.from, function (table_sources, name) {
		let table = tables[name] = Database(name)

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




module.exports = { SourceTreeQuery }

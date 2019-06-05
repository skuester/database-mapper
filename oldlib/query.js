const _ = require('lodash')

const { TableEnumerator, map_result_aliases, prefixer } = require('./utils')



class Query {
	constructor(opts = {}, knex) {
		this.enum = opts.enum || TableEnumerator()
		this.table_alias_map = opts.table_alias_map || {}
		this.joined_tables = opts.joined_tables || {}
		this.prefixers = opts.prefixers || {}
		this.root_table = opts.root_table
		this.mapper = opts.mapper || _.identity
		this.map_result_handler = opts.map_result_handler

		if (opts.knex) {
			this.knex = opts.knex
		}
		else {
			let alias = this.register_table(this.root_table)
			this.knex = knex(`${this.root_table} as ${alias}`).options({nestTables: true})
		}
	}

	register_table(path) {
		let alias = this.enum()
		this.table_alias_map[alias] = path
		this.create_prefixer(path, alias)
		return alias
	}

	create_prefixer(path, alias) {
		_.set(this.prefixers, path, prefixer(alias + '.'))
	}

	map_result(row) {
		if (!row) return row
		if (this.map_result_handler) return this.map_result_handler(row)
		return this.mapper(map_result_aliases(row, this.table_alias_map))
	}

	get_prefixer(path) {
		return _.get(this.prefixers, path)
	}

	will_map_result_manually(result_mapper_fn) {
		this.map_result_handler = result_mapper_fn
	}

	will_map_results_to_path(path) {
		this.will_map_results(result => _.get(result, path))
	}

	will_map_results(mapper) {
		this.mapper = mapper
	}


	clone() {
		let new_query = new Query({
			enum: this.enum,
			table_alias_map: this.table_alias_map,
			joined_tables: {},
			prefixers: this.prefixers,
			root_table: this.root_table,
			mapper: this.mapper,
			map_result_handler: this.map_result_handler,
			knex: this.knex.clone(),
		})

		for (let path in this.joined_tables) {
			new_query.joined_tables[path] = this.joined_tables[path].clone(new_query)
		}

		return new_query
	}

}




module.exports = { Query }

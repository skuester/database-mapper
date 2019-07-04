class Query {
	constructor(knex, table) {
		this.knex = knex
		this.root_scope = this.scope(table)
		this.query = knex(`${this.root_scope.table.name} as ${this.root_scope.id}`)
	}


	scope(table) {
		return new QueryScope(table)
	}


	then(fn) {
		return this.knex.then(fn)
	}
}



class QueryScope {

	constructor(table, query, id) {
		this.table = table
		this.query = query
		this.id = id
	}


	select() {
		this.query.select(this.prefix('*'))
	}


	prefix(field) {
		return id + '.' + field
	}


	prefix_arg_list(id, args) {
		if (!args.length) return [this.prefix(id, '*')]
		return args.map(v => this.prefix(v))
	}
}


module.exports = Query
const { TableEnum, prefixer } = require('./utils')

class BuilderScope {

	constructor({ alias, table, result_path, runner }) {
		this.alias = alias
		this.table = table
		this.result_path = result_path
		this.runner = runner
		this.prefixer = prefixer(this.alias)
	}

	get q() {
		return this.runner.query
	}

	select(...args) {
		this.q.select(...args)
		return this
	}

	first(...args) {
		this.q.first(...args)
		return this
	}

	join(relation_name, block_fn) {
		let rel = this.meta.relations[relation_name]

		let scope = this.runner.create_scope({
			table: rel.table,
			result_path: this.result_path.concat(rel.name)
		})

		this.q.join(`${rel.table} as ${scope.alias}`, ...rel.on(this.prefixer, scope.prefixer))

		block_fn(scope)

		return this
	}

	then(block_fn) {
		return this.q.then(block_fn)
	}
}



class QueryRunner {
	constructor(DB) {
		this.DB = DB
		this.scopes = []
		this.enum = TableEnum()
		this.query = null
	}


	create_root_scope(table) {
		let scope = this.create_scope({ table, result_path: table })
		this.query = this.DB.knex(`${table} as ${scope.alias}`).config({ nestTables: true })
		return scope
	}


	create_scope({ table, result_path }) {
		let alias = this.enum()

		let scope = new BuilderScope({
			alias,
			table: this.DB.meta(table),
			result_path,
			runner: this,
		})

		this.scopes.push(scope)

		return scope
	}


	// exec() {
	// 	let root_result = await this.knex('person').where('something')
	// 	let second_result = await child.exec(root_result.Person.ID)
	// 	_.set(root_result, 'Person.Relationship', second_result)

	// 	return root_result
	// }

	// map_result_row(row) {
	// 	this.scopes.reduce((result, scope) => {
	// 		_.set(result, scope.result_path, row[scope.alias])
	// 		return result
	// 	}, {})
	// }
}



function TableMeta(name, meta) {
	meta.name = name

	for (let rel_name in meta.relations) {
		let rel = meta.relations[rel_name]

		meta.relations[rel_name].exec = function (runner, result_path, join_method = 'join') {
			runner.query[join_method]()

			let scope = runner.create_scope({
				table: rel.table,
				result_path: result_path.concat(rel_name)
			})

			this.q.join(`${rel.table} as ${scope.alias}`, ...rel.on(this.prefixer, scope.prefixer))
		}
	}
}



module.exports = function DatabaseMapper(knex) {
	const TABLE_CLASSES = {}
	const TABLE_META = {}

	function DB(name) {
		return new TABLE_CLASSES[name]()
	}

	DB.knex = knex

	DB.table = function (name, config = {}) {
		TABLE_META[name] = TableMeta(name, config)

		TABLE_CLASSES[name] = function() {
			return new QueryRunner(DB).create_root_scope(name)
		}
	}

	DB.meta = function (name) {
		return TABLE_META[name]
	}

	return DB
}
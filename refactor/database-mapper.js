const _ = require('lodash')
const { TableEnum, prefixer } = require('./utils')




class BuilderScope {

	constructor({ alias, table, result_path, runner }) {
		this.alias = alias
		this.table = table
		this.result_path = result_path
		this.runner = runner
		this.prefixer = prefixer(`${this.alias}.`)
	}

	get q() {
		return this.runner.query
	}

	select(...args) {
		this.q.select(...prefix_select_args(this.prefixer, args))
		return this
	}

	first(...args) {
		this.q.first(...prefix_select_args(this.prefixer, args))
		return this
	}

	join(relation_name, block_fn) {
		let rel = this.table.relations[relation_name]

		let scope = this.runner.create_scope({
			table_name: rel.table,
			result_path: this.result_path.concat(relation_name)
		})

		this.q.join(`${rel.table} as ${scope.alias}`, ...rel.on(this.prefixer, scope.prefixer))

		block_fn(scope)

		return this
	}

	then(block_fn) {
		return this.runner.then(block_fn)
	}
}

define_where_method(BuilderScope.prototype, 'where')


function define_where_method(proto, where_method_name) {
	proto[where_method_name] = function (...args) {
		this.q[where_method_name](...prefix_where_args(this.prefixer, args))
		return this
	}
}


function prefix_where_args(prefixer, args) {
	if (_.isString(args[0])) {
		args[0] = prefixer(args[0])
	}
	else if (_.isObject(args[0])) {
		let where_obj = {}
		for (let key in args[0]) {
			where_obj[prefixer(key)] = args[0][key]
		}
		args[0] = where_obj
	}
	return args
}


function prefix_select_args(prefixer, args) {
	if (!args.length) return [prefixer('*')]
	return args.map(prefixer)
}















class QueryRunner {
	constructor(DB) {
		this.DB = DB
		this.scopes = []
		this.enum = TableEnum()
		this.query = null
	}


	create_root_scope(table_name) {
		let scope = this.create_scope({ table_name: table_name, result_path: [ table_name ] })
		this.query = this.DB.knex(`${table_name} as ${scope.alias}`).options({ nestTables: true })
		return scope
	}


	create_scope({ table_name, result_path }) {
		let alias = this.enum()

		let scope = new BuilderScope({
			alias,
			table: this.DB.meta(table_name),
			result_path,
			runner: this,
		})

		this.scopes.push(scope)

		return scope
	}


	then(block_fn) {
		return this.query.then(results => {
			if (_.isArray(results)) {
				return block_fn(results.map(row => this.map_result_row(row)))
			}
			else {
				return block_fn(this.map_result_row(results))
			}
		})
	}

	map_result_row(row) {
		return this.scopes.reduce((result, scope) => {
			_.set(result, scope.result_path, row[scope.alias])
			return result
		}, {})
	}
}













function TableMeta(name, meta) {
	meta.name = name
	return meta
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
const _ = require('lodash')
const { to_a } = require('./utils')



class DbTablePrototype {
	constructor(config, DB) {
		this.name = config.name
		this.DB = DB
		this.methods = config.methods ? Object.keys(config.methods) : []

		this.foreign_keys = [].concat(config.foreign_keys)
		this.relations = {}
		for (let name in config.relations) {
			this.relations[name] = Relation(name, config.relations[name], DB, this)
		}

		for (let key in config.methods) {
			this[key] = _def_chainable_method(config.methods[key])
		}

		// instance properties
		// path, _query, prefix
	}


	clone(new_query) {
		return this.DB(this.name, {
			path: this.path,
			query: new_query || this._query.clone(),
			prefix: this.prefix
		})
	}

	select(...args) {
		this._query.knex.select(...prefix_arg_list(this.prefix, args))
		return this
	}


	first(...args) {
		this._query.knex.first(...prefix_arg_list(this.prefix, args))
		return this
	}


	count() {
		this._query.will_map_result_manually(row => row && row.count)
		this._query.knex.count(`* as count`).first().options({nestTables: false})
		return this
	}


	id(id) {
		this.where('ID', id).first()
		return this
	}


	id_list(ids) {
		this.whereIn('ID', ids)
		return this
	}


	get_first(column) {
		return get_column.call(this, 'first', column)
	}


	get(column) {
		return get_column.call(this, 'select', column)
	}


	query(decorator_fn) {
		decorator_fn.call(this, this._query.knex, this.prefix)
		return this
	}


	paginate(opts) {
		let limit, offset

		if (opts.limit) {
			limit = opts.limit
			offset = opts.offset
		}
		else {
			opts.page = opts.page || 1
			limit = opts.page_size
			offset = (opts.page - 1) * opts.page_size
		}

		this._query.knex.limit(limit).offset(offset)

		if (opts.sort) {
			opts.sort.forEach(order => {
				_get_sorter(order.field)(this._query.knex, order)
			})
		}

		return this
	}


	then(block_fn) {
		return this._query.knex.then(results => {
			if (_.isArray(results)) {
				return block_fn(results.map(row => this._query.map_result(row)))
			}
			else {
				return block_fn(this._query.map_result(results))
			}
		})
	}


	map(block_fn) {
		return this._query.knex.map(row => {
			return block_fn(this._query.map_result(row))
		})
	}


	join(relation, query_fn) {
		this.include(relation, query_fn, 'join')
		return this
	}


	leftJoin(relation, query_fn) {
		this.include(relation, query_fn, 'leftJoin')
		return this
	}



	// TODO: make .join() use this interface (with optional args 3 and 4) and remove this
	include(relation, query_fn, join_type, path_override) {
		let other_table = this.get_join(relation, join_type, path_override)

		if (query_fn) query_fn.call(this, other_table)

		return this
	}


	get_join(relation, join_type = 'join', path_override) {
		return this.get_relation(relation).call(this, join_type, path_override)
	}


	get_relation(name) {
		let relation = this.relations[name]
		if (!relation || !name) throw new Error(`${this.name} table does not have a ${name} relation.`)
		return relation
	}


	toString() {
		return this._query.knex.toString()
	}


	log() {
		console.log('DbTable', this.name, '>', this.toString())
		return this
	}


	aot_compile() {
		var query_spec = this._query.knex.toSQL()

		return {
			sql_template: query_spec.sql,
			bindings: query_spec.bindings,
			table_alias_map: this._query.table_alias_map
		}
	}


	get_foreign_keys() {
		return this.foreign_keys
	}


	set_mapper(mapper) {
		this._query.will_map_results(mapper)
	}

}



define_where_method(DbTablePrototype.prototype, 'where')
define_where_method(DbTablePrototype.prototype, 'orWhere')
define_where_method(DbTablePrototype.prototype, 'whereNot')
define_where_method(DbTablePrototype.prototype, 'whereNull')
define_where_method(DbTablePrototype.prototype, 'whereNotNull')
define_where_method(DbTablePrototype.prototype, 'whereIn')
define_where_method(DbTablePrototype.prototype, 'whereNotIn')
define_where_method(DbTablePrototype.prototype, 'whereExists')
define_where_method(DbTablePrototype.prototype, 'whereNotExists')
define_where_method(DbTablePrototype.prototype, 'whereBetween')
define_where_method(DbTablePrototype.prototype, 'whereNotBetween')


define_passthru_method(DbTablePrototype.prototype, 'limit')
define_passthru_method(DbTablePrototype.prototype, 'offset')
define_passthru_method(DbTablePrototype.prototype, 'transacting')





function Relation(name, opts, DB, db_table) {
	opts.name = name

	if (opts.through) {
		return function join(join_type) {
			let output_table
			let base_name = this.name

			this[join_type](opts.through, function (middle_table) {
				middle_table.include(opts.relation, function (desired_table) {
					output_table = desired_table
				}, join_type, `${base_name}.${opts.name}`)
			})
			return output_table
		}
	}

	if (opts.belongs_to) {
		opts = {
			name: name,
			table: opts.belongs_to,
			on: { self: `${opts.belongs_to}ID` }
		}
	}

	if (opts.on && opts.on.self) {
		let rel = opts.on
		rel.other = rel.other || 'ID'
		db_table.foreign_keys.push(rel.self)
		opts.on = (table, other) => [table(rel.self), other(rel.other)]
	}


	if (opts.has_one) {
		let other_table_name = opts.has_one
		opts = {
			name: name,
			table: other_table_name,
			on: (table, other, table_name) => [table('ID'), other(`${table_name}ID`)],
			// FIXME: REMOVING FOR NOW - Incorporate another way to allow grouping as this presents problems with the mapper and
			// nested relations getting grouped when they shouldn't resulting in wrong counts
			// query: (q, table) => {
			// 	q.groupBy(table('ID'))
			// }
		}
	}


	// TODO: this should perhaps be moved into the Query class, since its using many of its internals
	//       I don't like that the joined_tables{} dict makes query a circular object
	// default join
	return function join(join_type, path_override) {
		let path = path_override || `${this.path}.${opts.name}`

		if (this._query.joined_tables[path]) return this._query.joined_tables[path]

		let alias = this._query.register_table(path)

		let other_table = this._query.joined_tables[path] = DB(opts.table, { query: this._query, path })

		let self = this

		if (opts.join) {
			this._query.knex[join_type](`${other_table.name} as ${alias}`, function () {
				opts.join.call(this, this, self.prefix, other_table.prefix)
			})
		}
		else {
			let join_on = opts.on(this.prefix, other_table.prefix, this.name)
			this._query.knex[join_type](`${other_table.name} as ${alias}`, ...join_on)
		}

		if (opts.query) {
			this.query(opts.query)
		}

		return other_table
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



function prefix_arg_list(prefixer, args) {
	if (!args.length) return [prefixer('*')]
	return args.map(prefixer)
}


function recursive_find(path, table, select = 'select') {
	if (path.length === 1) {
		table[select](path[0])
	}
	else {
		table.join(path[0], other_table => {
			recursive_find(path.slice(1), other_table, select)
		})
	}
}


function get_column(select, column) {
	if (column.indexOf('.') === -1) { // NOTE: strings starting with "." should be invalid
		this._query.will_map_results_to_path(this.path + '.' + column)
		this[select](column)
	}
	else {
		this._query.will_map_results_to_path(this.path + '.' + column)
		recursive_find(column.split('.'), this, select)
	}

	return this
}


function define_where_method(proto, where_method_name) {
	proto[where_method_name] = function (...args) {
		this._query.knex[where_method_name](...prefix_where_args(this.prefix, args))
		return this
	}
}


function define_passthru_method(proto, method_name) {
	proto[method_name] = function (...args) {
		this._query.knex[method_name](...args)
		return this
	}
}


function _def_chainable_method(fn) {
	return function (...args) {
		fn.call(this, ...args)
		return this
	}
}


function _get_sorter(name) {
	return function (query, order) {
		to_a(name).forEach(db_field => query.orderBy(db_field, order.dir))
	}
}


module.exports = { DbTablePrototype, _def_chainable_method }

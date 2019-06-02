const _ = require('lodash')
const { SourceTreeQuery } = require('./source-tree-query')
const { _def_chainable_method } = require('../db-table-prototype')



// NOTE: for simplicity, we're only going to use a single query, despire theoritically being able to do more
function DataView (Database, {mapper, scope, methods, log} = {}) {
	if (!mapper) throw new Error('DataView: missing {mapper}. The mapper defines the response.')

	const STATE = {write_to_log: log}
	const BASE_QUERY = SourceTreeQuery(Database, mapper.source_tree()).$first

	if (scope) {
		return scoped_query_runner(scope)
	}
	else {
		return build_instance
	}


	function build_instance() {
		let instance = Object.create(BASE_QUERY.clone())

		if (methods) {
			for (let name in methods) {
				instance[name] = _def_chainable_method(methods[name])
			}
		}

		instance.set_mapper(row => mapper.read(row))

		return instance
	}



	function scoped_query_runner(scope_fn) {
		return function runner(...scope_params) {
			let query_copy = BASE_QUERY.clone()

			scope_fn(query_copy, ...scope_params)

			if (STATE.write_to_log) {
				// console.log('DataView: running query (BASE) >', BASE_QUERY.toString())
				console.log('-----------------------')
				console.log('DataView: DEBUG QUERY')
				console.log('DataView: sql >', query_copy.toString())
				console.log('-----------------------')
			}

			return query_copy.then(results => {
				if (_.isArray(results)) return results.map(row => mapper.read(row))
				else if (_.isObject(results)) return mapper.read(results)
				else return results
			})
		}
	}

}



module.exports = { DataView }

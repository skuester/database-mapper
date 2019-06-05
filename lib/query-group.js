class QueryGroup {
	constructor(knex) {

	}

}



class TableScope {
	constructor(alias) {
		this.prefix = prefix(alias)
		this.children = []
	}

	get_count() {
		this.query.use(result => result.count)
		this.query.knex.count('* as count')
	}

	get_first(field) {
		this.use(result => result[field])
		this.query.first(field)
	}

	join(relation_name) {
		let relation = this.table.get_relation(relation_name)

		if (relation.is_single) {
			let scope = new TableScope(relation.get_table())
			this.query.register_scope(relation_name, scope)
		}
		else if (relation.is_many) {
			this.query_group
		}
	}


	process_result(row) {
		let result = row[this.alias]

		this.children.forEach(child => {
			_.set(result, child.path. child.scope.process_result(row))
		})

		return result
	}
}

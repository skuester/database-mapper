class BuilderScope {

	constructor(q) {
		this.q = q.options({ nestTables: true })
	}

	select(...args) {
		this.q.select(...args)
		return this
	}

	first(...args) {
		this.q.first(...args)
		return this
	}

	then(block_fn) {
		return this.q.then(block_fn)
	}

}


module.exports = function DatabaseMapper(knex) {
	const TABLE_CLASSES = {}

	function DB(name) {
		return new TABLE_CLASSES[name]()
	}

	DB.table = function (name, config = {}) {
		TABLE_CLASSES[name] = function() {
			return new BuilderScope(knex(name))
		}
	}

	return DB
}
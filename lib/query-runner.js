class QueryRunner {
	constructor(query) {
		this.queries = []
	}

	then(fn) {
		return Promise.all(this.queries).then(results => {
			return this.reduce_results(results)
		})
	}

	reduce_results(results) {
		return results
	}
}
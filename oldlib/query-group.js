class QueryGroup {
	constructor() {
		this.queries = []
	}

	then() {
		return Promise.all(this.queries)
	}
}
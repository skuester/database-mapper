const _ = require('lodash')


module.exports = {
	prefixer,
	TableEnumerator,
	map_result_aliases,
	to_a
}


function prefixer(prefix) {
	return (str) => prefix + str
}




function TableEnumerator() {
	var count = 0
	return function next() {
		return 't' + (count += 1)
	}
}



function map_result_aliases(row, table_alias_map) {
	var result = {}

	for (let alias in table_alias_map) {
		if (!row[alias]) continue

		_.set(result, table_alias_map[alias], row[alias])
	}

	return result
}


function to_a(value) {
	return _.isArray(value) ? value : [].concat(value)
}

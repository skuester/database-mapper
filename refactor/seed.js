const _ = require("lodash")


module.exports = function Seed(client, ...seeds) {

	var tables = concat_seeds(seeds)


	return {
		add: do_in_transaction(add),
		remove: do_in_transaction(remove),
		insert: do_in_transaction(insert),
		tables,
	};




	// ensure the required remove() first, then add() happens
	function insert(tx) {
		return remove(tx).then(() => add(tx))
	}


	function add(tx) {
		var promises = []

		for (let table_name in tables) {
			promises.push(client(table_name).insert(tables[table_name]).transacting(tx))
		}

		return Promise.all(promises)
	}


	function remove(tx) {
		var promises = []

		for (let table_name in tables) {
			promises.push(client(table_name).truncate().transacting(tx))
		}

		return Promise.all(promises)
	}


	function concat_seeds(seeds) {
		return seeds.reduce((combined, seed) => {
			return _.mergeWith(combined, seed, function (table_a, table_b) {
				if (!table_a) return table_b
				return table_a.concat(table_b)
			})
		}, {})
	}


	function do_in_transaction(fn) {
		return function () {
			return client.transaction(function (tx) {
				fn(tx).then(tx.commit).catch(tx.rollback)
			})
		}
	}
}

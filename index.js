const Database = require('./lib/database')


module.exports = function DatabaseMapper(knex) {
	return new Database(knex)
}


/*
DB('Author')
	.select('id', 'name')


	// similar to join, but helps make it clear that 'where' clauses will not effect the main query or limit scoping
	.include('Posts', { as: 'ActivePosts' }, Post => {
		Post.select('id', 'title', 'content')
			.where('is_active', true)
			.include('tags', Tag => {
				Tag.select('id', 'title')
			})
	})


	// again, other query will not limit results
	.include(other_query, null, { as: 'ActivePosts' })


	// subquery auto-gets an "as()" call
	.leftJoin(other_query, { as: 'ResultsName' }, (q, Author, Bad) => {
		q.on(Bad('id'), Author('id'))
	})


	.query((q, Author) => {
		q.whereIn(Author('field'), [123, 456])
	})
*/
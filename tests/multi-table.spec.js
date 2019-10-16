const knex = require('knex')(require('../knexfile.js'))
const DatabaseMapper = require('../index')
const Seed = require("../seed")
const assert = require('assert')


after(async function () {
	await knex.destroy()
})


describe ("DatabaseMapper (multiple tables)", function () {
	let DB


	before(async function () {
		DB = DatabaseMapper(knex)

		let seed = Seed(knex, {
			Author: [
				{ id: 1, Name: 'Author A', friend_id: 2 },
				{ id: 2, Name: 'Author B', friend_id: 1 },
			],
			post: [
				{ ID: 1, the_author_id: 1, BlogTitle: 'Example Post 1', BlogContent: 'Hello World 1' },
				{ ID: 2, the_author_id: 1, BlogTitle: 'Example Post 2', BlogContent: 'Hello World 2' },
				{ ID: 3, the_author_id: 2, BlogTitle: 'Post by other guy', BlogContent: 'Other Post 3' },
			]
		})

		await seed.insert()
	})


	beforeEach(function () {
		DB.table('Author', {
			relations: {
				posts: {
					has_many: 'post',
					key: 'id',
					foreign_key: 'the_author_id',
				}
			}
		})
		DB.table('Post')
	})

	describe ('joining a has_many relationship', function () {

		it ('returns the result of a second query, with values nested under the first', async function () {
			let results = await DB('Author')
				.select('Name')
				.include('posts', Post => {
					Post.select()
				})

			assert.deepEqual(results, [
				{
					Author: {
						Name: 'Author A',
						posts: [
							{ post: { ID: 1, the_author_id: 1, BlogTitle: 'Example Post 1', BlogContent: 'Hello World 1' }},
							{ post: { ID: 2, the_author_id: 1, BlogTitle: 'Example Post 2', BlogContent: 'Hello World 2' }},
						]
					}
				},
				{
					Author: {
						Name: 'Author B',
						posts: [
							{ post: { ID: 3, the_author_id: 2, BlogTitle: 'Post by other guy', BlogContent: 'Other Post 3' }},
						]
					}
				},
			])
		})
	})


})

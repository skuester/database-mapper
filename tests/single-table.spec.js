const knex = require('knex')(require('../knexfile.js'))
const DatabaseMapper = require('../index')
const Seed = require("../seed")
const assert = require('assert')


describe.only ("DatabaseMapper (single table)", function () {
	let DB


	after(async function () {
		await knex.destroy()
	})


	before(async function () {
		DB = DatabaseMapper(knex)

		let seed = Seed(knex, {
			Author: [
				{ id: 1, Name: 'Author A', friend_id: 2 },
				{ id: 2, Name: 'Author B', friend_id: 1 },
			]
		})

		await seed.insert()
	})





	beforeEach(function () {
		DB.table('Author')
	})

	describe ('#select()', function () {

		it ('returns an array, with values nested under the table', async function () {
			let results = await DB('Author').select()

			assert.deepEqual(results, [
				{ Author: { id: 1, Name: 'Author A', friend_id: 2 } },
				{ Author: { id: 2, Name: 'Author B', friend_id: 1 } },
			])
		})

		it ('accepts the same arguments as knex#select()', async function () {
			let results = await DB('Author').select('Name')

			assert.deepEqual(results, [
				{ Author: { Name: 'Author A' } },
				{ Author: { Name: 'Author B' } },
			])
		})
	})



	describe ('#first()', function () {

		it ('can use first()', async function () {
			let results = await DB('Author').first()

			assert.deepEqual(results,
				{ Author: { id: 1, Name: 'Author A', friend_id: 2 } }
			)
		})

		it ('accepts the same arguments as knex#first()', async function () {
			let results = await DB('Author').first('Name')

			assert.deepEqual(results,
				{ Author: { Name: 'Author A' } },
			)
		})

		it ('works with aliases', async function () {
			let results = await DB('Author').first('Name as the_name')

			assert.deepEqual(results,
				{ Author: { the_name: 'Author A' } },
			)
		})
	})


	describe ('#modify()', function () {
		it ('is an escape hatch to manually use the knex query directly', async function () {
			let results = await DB('Author').modify((knex, Author) => {
				knex
					.first(`${Author('Name')} as custom_name`)
					.where(Author('id'), 1)
			})

			assert.deepEqual(results,
				{ Author: { custom_name: 'Author A' }}
			)
		})
	})



	describe ('joins and name conflicts', function () {
		beforeEach(function () {
			DB.table('Author', {
				relations: {
					friend: {
						table: 'Author',
						on: (Author, Other) => [Author('friend_id'), Other('id')]
					}
				}
			})
		})

		it ('can select a self-join without fear of table name conflict', async function () {

			let results = await DB('Author')
				.where('id', 1)
				.first()
				.join('friend', Friend => {
					Friend.select()
				})

			assert.deepEqual(results, {
				Author: {
					id: 1,
					Name: 'Author A',
					friend_id: 2,
					friend: {
						id: 2,
						Name: 'Author B',
						friend_id: 1
					}
				}
			})
		})


		it ('handles #select() inside a scope, just the same as if it were on the top level', async function () {

			let results = await DB('Author')
				.where('id', 1)
				.first()
				.join('friend', Friend => {
					Friend.select('Name')
				})

			assert.deepEqual(results, {
				Author: {
					id: 1,
					Name: 'Author A',
					friend_id: 2,
					friend: {
						Name: 'Author B',
					}
				}
			})
		})

	})


})

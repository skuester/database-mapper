const knex = require('knex')(require('../knexfile.js'))
const DatabaseMapper = require('../index')
const Seed = require("../seed")
const assert = require('assert')


describe.only ("DatabaseMapper (single table)", function () {
	let DB


	after(async function () {
		await knex.destroy()
	})


	describe ('SELECT queries', function () {

		before(async function () {
			DB = DatabaseMapper(knex)

			let seed = Seed(knex, {
				Author: [
					{ id: 1, Name: 'Author A' },
					{ id: 2, Name: 'Author B' },
				]
			})

			await seed.insert()
		})

		beforeEach(function () {
			DB.table('Author')
		})

		it ('selects an array', async function () {
			let results = await DB('Author').select()

			assert.deepEqual(results, [
				{ id: 1, Name: 'Author A' },
				{ id: 2, Name: 'Author B' },
			])
		})

	})




})

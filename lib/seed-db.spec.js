let knex = require('knex')(require('../knexfile.js'))
const SeedDB = require("./seed-db")
const assert = require('assert')


describe ("SeedDB", function () {
	after(async function () {
		await knex.destroy()
	})

	it ("seeds the database", async function () {
		let seed = new SeedDB(knex, {
			Person: [
				{FirstName: 'first', LastName: 'firstson'},
				{FirstName: 'second', LastName: 'Last', AddressID: 1}
			],
			Address: [
				{Street: '123 Road St', City: 'Townville', Country: 'USA'}
			]
		})


		await seed.insert()

		let person = await knex('Person').select()
		let address = await knex('Address').select()

		assert.equal(address.length, 1)
		assert.equal(person.length, 2)
		assert.equal(person[0].FirstName, 'first')
		assert.equal(person[0].id, 1)
	});


	it ("merges the various seeds together", async function () {
		let first = {
			Person: [
				{FirstName: 'first', LastName: 'last'}
			]
		}

		let second = {
			Person: [
				{FirstName: 'second', LastName: 'last'}
			]
		}

		let seed = new SeedDB(knex, first, second)
		await seed.insert()

		let person = await knex('Person').select()

		assert.equal(person.length, 2)
		assert.equal(person[0].FirstName, 'first')
		assert.equal(person[1].FirstName, 'second')
	});
});

const knex = require('knex')(require('../knexfile.js'))
const Database = require('./database')
const SeedDB = require("./seed-db")
const assert = require('assert')


describe ("Database", function () {
	var DB, seed

	before(async function () {
		DB = Database(knex)

		seed = SeedDB(knex, {
			Meta: [
				{ ID: 1, TenantID: 99 },
				{ ID: 2, TenantID: 99 },
			],
			Tenant: [
				{ ID: 99, Name: 'Example Tenant' },
			],
			Person: [
				{ ID: 1, FirstName: 'Example Person', AddressID: 1, MetaID: 1 },
				{ ID: 2, FirstName: 'Example Person 2', MetaID: 2 },
			],
			Address: [
				{ ID: 1, Street: '123 Street' },
			]
		})

		await seed.insert()
	})

	after(async function () {
		await knex.destroy()
	})


	context('results', function () {
		beforeEach(function () {
			DB.table('Meta', {
				relations: {
					Tenant: {
						table: 'Tenant',
						on: (obj, Tenant) => []
					}
				}
			})

			DB.table('Tenant', {
				relations: {
					Meta: {
						belongs_to: 'Meta'
					},
				}
			})


			DB.table('Address')

			DB.table('Person', {
				relations: {
					Address: {
						belongs_to: 'Address'
					},
					Meta: {
						table: 'Meta',
						on: (Person, obj) => [Person('MetaID'), obj('ID')]
					},
					account: {
						through: 'Meta',
						relation: 'Tenant'
					}
				}
			})
		})


		describe ("#select()", function () {
			it ("returns a nested result", async function () {
				let results = await DB('Person')
					.select('FirstName')
					.join('Address', function (Address) {
						Address.select('Street')
					})
					.join('account', function (Tenant) {
						Tenant.select('Name')
					})

				let output = {
					Person: {
						FirstName: 'Example Person',

						Address: {
							Street: '123 Street'
						},

						account: {
							Name: 'Example Tenant'
						}
					}
				}

				assert.deepEqual( results[0], output )
			});
		});


		describe ("#first()", function () {
			it ("returns a single nested result", async function () {
				let result = await DB('Person')
					.first('FirstName')
					.join('Address', function (Address) {
						Address.select('Street')
					})
					.join('account', function (Tenant) {
						Tenant.select('Name')
					})

				let output = {
					Person: {
						FirstName: 'Example Person',

						Address: {
							Street: '123 Street'
						},

						account: {
							Name: 'Example Tenant'
						}
					}
				}

				assert.deepEqual( result , output )
			});
		});




		describe ("#get_first()", function () {

			it ("selects a single result and returns the value of a single property", async function () {
				let result = await DB('Person').where('ID', 1).get_first('FirstName')

				let output = 'Example Person'

				assert.deepEqual( result , output )
			});


			it ("selects a single value from a nested relation", async function () {
				let result = await DB('Person').where('ID', 1).get_first('Meta.Tenant.Name')

				let output = 'Example Tenant'

				assert.deepEqual( result , output )
			});


			it ("works inside a joined table block", async function () {
				let result = await DB('Person')
					.where('ID', 1)
					.join('Meta', Obj => {
						Obj.join('Tenant', Tenant => {
							Tenant.get_first('Name')
						})
					})

				let output = 'Example Tenant'

				assert.deepEqual( result , output )
			});

			it ("works inside a joined table block with nested key", async function () {
				let result = await DB('Person')
					.where('ID', 1)
					.join('Meta', Obj => {
						Obj.get_first('Tenant.Name')
					})

				let output = 'Example Tenant'

				assert.deepEqual( result , output )
			});


		});



		describe ("#get()", function () {

			it ("selects an array and returns the value of a single property", async function () {
				let result = await DB('Person').where('ID', 1).get('FirstName')

				let output = ['Example Person']

				assert.deepEqual( result , output )
			});


			it ("selects a value from a nested relation", async function () {
				let result = await DB('Person').get('Meta.Tenant.Name')

				let output = ['Example Tenant', 'Example Tenant']

				assert.deepEqual( result , output )
			});


			it ("works inside a joined table block", async function () {
				let result = await DB('Person')
					.where('ID', 1)
					.join('Meta', Obj => {
						Obj.join('Tenant', Tenant => {
							Tenant.get('Name')
						})
					})

				let output = ['Example Tenant']

				assert.deepEqual( result , output )
			});

			it ("works inside a joined table block with nested key", async function () {
				let result = await DB('Person')
					.join('Meta', Obj => {
						Obj.get('Tenant.Name')
					})

				let output = ['Example Tenant', 'Example Tenant']

				assert.deepEqual( result , output )
			});


		});



		describe ("#count()", function () {
			it ("gets a simple count for the query", async function () {
				let Person_count = await DB('Person').count()
				assert.deepEqual( Person_count , 2 )

				let Tenant_count = await DB('Tenant').count()
				assert.deepEqual( Tenant_count , 1 )
			})
		})




	})





});

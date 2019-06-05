const knex = require('knex')(require('../../knexfile'))
const Database = require('../database')
const assert = require('assert')
const GraphMapper = require('graph-mapper')
const SeedDB = require("../seed-db")



describe ("DataView", function () {
	var DB, seed, mapper


	before(async function () {
		DB = Database(knex)

		seed = SeedDB(knex, {
			Meta: [
				{ ID: 1, TenantID: 11 },
				{ ID: 2, TenantID: 11 },
				{ ID: 3, TenantID: 22 },
			],
			Tenant: [
				{ ID: 11, Name: 'Example Tenant 11' },
				{ ID: 22, Name: 'Example Tenant 22' },
			],
			Person: [
				{ ID: 1, FirstName: 'Example Person 1', AddressID: 1, MetaID: 1 },
				{ ID: 2, FirstName: 'Example Person 2', AddressID: 2, MetaID: 2 },
				{ ID: 3, FirstName: 'Example Person 3', AddressID: 3, MetaID: 3 },
			],
			Address: [
				{ ID: 1, Street: '123 Street' },
				{ ID: 2, Street: '456 Road' },
				{ ID: 3, Street: '789 Road' },
			]
		})

		await seed.insert()
	})

	after(async function () {
		await knex.destroy()
	})


	beforeEach(function () {
		mapper = new GraphMapper.Registry()

		mapper.define('Person', {
			from: 'Person',
			to: {
				id: 'ID',
				name: 'FirstName',
				address: mapper.use('address', {from: 'Address'}),
				account: mapper.use('account', {from: 'Tenant'})
			}
		})

		mapper.define('address', {
			from: 'Address',
			to: {
				id: 'ID',
				street1: 'Street',
			}
		})

		mapper.define('account', {
			from: 'Tenant',
			to: {
				id: 'ID',
				name: 'Name'
			}
		})

		DB.table('Meta', {
			relations: {
				Tenant: {
					belongs_to: 'Tenant'
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
					belongs_to: 'Meta'
				},
				Tenant: {
					through: 'Meta',
					relation: 'Tenant'
				}
			},
			methods: {
				for_Tenant_22() {
					this.join('Meta', Obj => Obj.where('TenantID', 22))
				}
			}
		})
	})




	it ("the result with a query derived from all paths defined in the mapper", async function () {

		let query = DB.DataView({
			mapper: mapper.get('Person'),
			scope: function (Person, {Tenant_id}) {
				Person.join('Tenant', function (Tenant) {
					Tenant.where('ID', Tenant_id)
				})
			}
		})

		let Persons = await query({Tenant_id: 11})

		assert.deepEqual( Persons , [
			{ id: 1, name: 'Example Person 1', address: { id: 1, street1: '123 Street'}, account: { id: 11, name: 'Example Tenant 11' }},
			{ id: 2, name: 'Example Person 2', address: { id: 2, street1: '456 Road'  }, account: { id: 11, name: 'Example Tenant 11' }},
		])
	});



	it ("FOR NOW: gives no special warnings when params are empty, but knex will still complain.", async function () {
		let query = DB.DataView({
			mapper: mapper.get('Person'),
			scope: function (Person, {Tenant_id}) {
				Person.join('Tenant', function (Tenant) {
					Tenant.where('ID', Tenant_id)
				})
			}
		})

		assert.throws( () => query() )
	});


	it ("throws an error if the DataView is defined without the required arguments", function () {
		assert.throws( () => DB.DataView() , {message: `DataView: missing {mapper}. The mapper defines the response.` })
	})


	it ("TEST: works with a mix of static binds which are not needed from the user", async function () {
		let query = DB.DataView({
			mapper: mapper.get('Person'),
			scope: function (Person, { Tenant_id }) {
				Person
					.join('Tenant', function (Tenant) {
						Tenant.where('ID', Tenant_id)
					})
					.where('AddressID', 1)
			}
		})

		let Persons = await query({ Tenant_id: 11 })

		assert.deepEqual(Persons, [
			{ id: 1, name: 'Example Person 1', address: { id: 1, street1: '123 Street' }, account: { id: 11, name: 'Example Tenant 11' } },
		])
	})


	it ("TEST: works over multiple uses - checking that it clones properly", async function () {
		let query = DB.DataView({
			mapper: mapper.get('Person'),
			scope: function (Person, { Tenant_id }) {
				Person
					.join('Tenant', function (Tenant) {
						Tenant.where('ID', Tenant_id)
					})
					.query(q => q.limit(1))
			}
		})

		let Persons = null

		Persons = await query({ Tenant_id: 22 })
		Persons = await query({ Tenant_id: 11 })

		assert.deepEqual(Persons, [
			{ id: 1, name: 'Example Person 1', address: { id: 1, street1: '123 Street' }, account: { id: 11, name: 'Example Tenant 11' } },
		])
	})


	it ("TEST: works when the scope returns a simple value result", async function () {
		let query = DB.DataView({
			mapper: mapper.get('Person'),
			scope: function (Person) {
				Person.count()
			}
		})

		let result = await query()

		assert.deepEqual(result,  3 )
	})


	it ("TEST: works when the scope returns a single row result", async function () {
		let query = DB.DataView({
			mapper: mapper.get('Person'),
			scope: function (Person) {
				Person.first().where('ID', 1)
			}
		})

		let result = await query()

		assert.deepEqual( result.name ,  'Example Person 1' )
	})


	it ("will proxy to defined table methods if no scope is defined", async function () {
		let query = DB.DataView({
			mapper: mapper.get('Person')
		})

		let Persons = await query().for_Tenant_22()

		assert.deepEqual( Persons , [
			{ id: 3, name: 'Example Person 3', address: { id: 3, street1: '789 Road' }, account: { id: 22, name: 'Example Tenant 22' } },
		])
	})

	it ("always defines an .id() method for simple where ID = x, and returns a SINGLE result", async function () {
		let query = DB.DataView({
			mapper: mapper.get('Person')
		})

		let Person = await query().id(3)

		assert.deepEqual(Person,
			{ id: 3, name: 'Example Person 3', address: { id: 3, street1: '789 Road' }, account: { id: 22, name: 'Example Tenant 22' } },
		)
	})

	it ("accepts additional methods defined on the DataView, in addition to the DbTable prototype", async function () {
		let query = DB.DataView({
			mapper: mapper.get('Person'),
			methods: {
				by_name(name) {
					this.where('FirstName', name)
				}
			}
		})

		let result = await query().id(3)

		assert.deepEqual(result,
			{ id: 3, name: 'Example Person 3', address: { id: 3, street1: '789 Road' }, account: { id: 22, name: 'Example Tenant 22' } },
		)

		result = await query().by_name('Example Person 2')

		assert.deepEqual(result, [
			{ id: 2, name: 'Example Person 2', address: { id: 2, street1: '456 Road' }, account: { id: 11, name: 'Example Tenant 11' } },
		])
	})


	it ("returns simple values for value methods like .count()", async function () {
		let query = DB.DataView({
			mapper: mapper.get('Person'),
			methods: {
				by_name(name) {
					this.where('FirstName', name)
				}
			}
		})

		let result = null

		result = await query().count()
		assert.deepEqual( result ,  3 )

		result = await query().by_name('Example Person 2').count()
		assert.deepEqual( result ,  1 )
	})

});


exports.up = function(knex, Promise) {
	return knex.schema
		.createTable('Person', t => {
			t.increments('id')
			t.string('FirstName')
			t.string('LastName')
			t.integer('AddressID').index()
			t.integer('MetaID').index()
		})

		.createTable('Address', t => {
			t.increments('id')
			t.string('Street')
			t.string('City')
			t.string('Country')
		})

		.createTable('Meta', t => {
			t.increments('id')
			t.integer('TenantID').index()
		})

		.createTable('Tenant', t => {
			t.increments('id')
			t.string('Name')
		})
};

exports.down = function(knex, Promise) {
	return knex.schema
		.dropTable("Person")
		.dropTable("Address")
		.dropTable("Meta")
		.dropTable("Tenant")
};

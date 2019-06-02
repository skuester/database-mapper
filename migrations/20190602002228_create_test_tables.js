
exports.up = function(knex, Promise) {
	return knex.schema
		.createTable('Person', t => {
			t.increments('id')
			t.string('FirstName')
			t.string('LastName')
			t.string('AddressID')
		})

		.createTable('Address', t => {
			t.increments('id')
			t.string('Street')
			t.string('City')
			t.string('Country')
		})
};

exports.down = function(knex, Promise) {
	return knex.schema
		.dropTable("Person")
		.dropTable("Address")
};

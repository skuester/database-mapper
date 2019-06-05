
exports.up = function(knex, Promise) {
	return knex.schema
		.createTable('Author', t => {
			t.increments('id')
			t.string('Name')
		})

		.createTable('post', t => {
			t.increments('ID')
			t.integer('the_author_id')
			t.string('BlogTitle')
			t.string('BlogContent')
			t.boolean('IsDraft').default(0)
		})

		.createTable('Tag', t => {
			t.increments('id')
			t.string('Name')
		})

		.createTable('Post_Tag', t => {
			t.integer('post_id')
			t.integer('TagID')
		})
};

exports.down = function(knex, Promise) {
	return knex.schema
		.dropTable("Author")
		.dropTable("post")
		.dropTable("Tag")
		.dropTable("Post_Tag")
};

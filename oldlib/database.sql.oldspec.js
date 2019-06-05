const knex = require('knex')(require('../knexfile.js'))
const assert = require('assert')
const Database = require('./database')

describe ("Database SQL Results", function () {
	let DB

	before(function () {
		DB = Database(knex)
	})

	after(async function () {
		await knex.destroy()
	})


	context('simple examples', function () {
		beforeEach(function () {
			DB.table('User', {
				methods: {
					is_admin() {
						this.where('role', 'ADMIN')
					}
				}
			})
		})


		it ("returns an error for a missing table", function () {
			assert.throws( () => DB('DOES_NOT_EXIST'), { message: 'No table defined for DOES_NOT_EXIST' })
		});


		describe ("#select()", function () {
			it ("namespaces field names when *", function () {
				test(
					DB('User').select(),
					"select `t1`.* from `User` as `t1`"
				)
			});

			it ("namespaces field names when single", function () {
				test(
					DB('User').select('foo'),
					"select `t1`.`foo` from `User` as `t1`"
				)
			});


			it ("namespaces field names when multiple", function () {
				test(
					DB('User').select('foo', 'bar'),
					"select `t1`.`foo`, `t1`.`bar` from `User` as `t1`"
				)
			});
		});


		describe ("#first()", function () {
			it ("namespaces field names when *", function () {
				test(
					DB('User').first(),
					"select `t1`.* from `User` as `t1` limit 1"
				)
			});

			it ("namespaces field names when single", function () {
				test(
					DB('User').first('foo'),
					"select `t1`.`foo` from `User` as `t1` limit 1"
				)
			});


			it ("namespaces field names when multiple", function () {
				test(
					DB('User').first('foo', 'bar'),
					"select `t1`.`foo`, `t1`.`bar` from `User` as `t1` limit 1"
				)
			});
		});


		describe ("#where()", function () {
			it ("generates a simple query with simple where", function () {
				test(
					DB('User').select().where('IsPlaceholder', 1),
					"select `t1`.* from `User` as `t1` where `t1`.`IsPlaceholder` = 1"
				)
			});


			it ("generates a simple query with object where", function () {
				test(
					DB('User').select().where({IsPlaceholder: 1, IsActive: 1}),
					"select `t1`.* from `User` as `t1` where `t1`.`IsPlaceholder` = 1 and `t1`.`IsActive` = 1"
				)
			});
		});



		it ("can use pre-defined scope methods", function () {
			test(
				DB('User').is_admin().select(),
				"select `t1`.* from `User` as `t1` where `t1`.`role` = 'ADMIN'"
			)
		});


		describe ("#paginate", function () {
			it ("can use a {page} and {page_size} parameter", function () {
				test(
					DB('User').select().paginate({page: 3, page_size: 10}),
					"select `t1`.* from `User` as `t1` limit 10 offset 20"
				)
			})

			it("defaults to page 1", function () {
				test(
					DB('User').select().paginate({ page: 0, page_size: 10 }),
					"select `t1`.* from `User` as `t1` limit 10"
				)

				test(
					DB('User').select().paginate({ page: 1, page_size: 10 }),
					"select `t1`.* from `User` as `t1` limit 10"
				)
			})

			it ("will accept a manual limit and offset which override page and page_size", function () {
				test(
					DB('User').select().paginate({ page: 1, page_size: 10, limit: 123, offset: 7 }),
					"select `t1`.* from `User` as `t1` limit 123 offset 7"
				)
			})
		})
	})


	describe ("#join()", function () {

		context("with simple relation, manual config", function () {

			beforeEach(function () {
				DB.table('Person')

				DB.table('regMember', {
					relations: {
						profile: {
							table: 'Person',
							on: (regMember, Person) => [regMember('PersonID'), Person('ID')]
						},
					}
				})
			})


			it ("can join and use related tables", function () {
				test(

					DB('regMember')
						.select('ID')
						.join('profile', function (Person) {
							Person.select('ID', 'FirstName')
						}),

					"select `t1`.`ID`, `t2`.`ID`, `t2`.`FirstName` from `regMember` as `t1` inner join `Person` as `t2` on `t1`.`PersonID` = `t2`.`ID`"
				)
			});



			it ("can safely join the same relation twice, without duplication", function () {
				test(

					DB('regMember')
						.select('ID')
						.join('profile', function (Person) {
							Person.select('ID', 'FirstName')
						})
						.join('profile', function (Person) {
							Person.where('FirstName', 'Batman')
						}),

					"select `t1`.`ID`, `t2`.`ID`, `t2`.`FirstName` from `regMember` as `t1` inner join `Person` as `t2` on `t1`.`PersonID` = `t2`.`ID` where `t2`.`FirstName` = 'Batman'"
				)
			});
		})


		context("with simple object relation definition", function () {

			it("can join and use related tables", function () {
				DB.table('Person')

				DB.table('regMember', {
					relations: {
						profile: {
							table: 'Person',
							on: { self: 'PersonID', other: 'ID' },
						},
					}
				})

				test(

					DB('regMember')
						.select('ID')
						.join('profile', function (Person) {
							Person.select('ID', 'FirstName')
						}),

					"select `t1`.`ID`, `t2`.`ID`, `t2`.`FirstName` from `regMember` as `t1` inner join `Person` as `t2` on `t1`.`PersonID` = `t2`.`ID`"
				)
			})


			it("defaults to using 'ID' as the {other} key", function () {
				DB.table('Person')

				DB.table('regMember', {
					relations: {
						profile: {
							table: 'Person',
							on: { self: 'PersonID' },
						},
					}
				})

				test(

					DB('regMember')
						.select('ID')
						.join('profile', function (Person) {
							Person.select('ID', 'FirstName')
						}),

					"select `t1`.`ID`, `t2`.`ID`, `t2`.`FirstName` from `regMember` as `t1` inner join `Person` as `t2` on `t1`.`PersonID` = `t2`.`ID`"
				)
			})
		})


		describe ("#get_join()", function () {
			it ("returns the joined table object", function () {

					let member = DB('regMember').select('ID')

					let profile = member.get_join('profile')

					profile
						.select('ID', 'FirstName')
						.where('ID', '=', 'Batman')

				test(
					member,
					"select `t1`.`ID`, `t2`.`ID`, `t2`.`FirstName` from `regMember` as `t1` inner join `Person` as `t2` on `t1`.`PersonID` = `t2`.`ID` where `t2`.`ID` = 'Batman'"
				)
			});
		});



		context("with through relations", function () {

			beforeEach(function () {
				DB.table('Owner', {
					relations: {
						Object: {
							table: 'Object',
							on: (Owner, ObjectTable) => [Owner('ObjectID'), ObjectTable('ID')]
						}
					},
					methods: {
						active() {
							this.join('Object', (ObjectTable) => ObjectTable.active())
						}
					}
				})

				DB.table('Object', {
					relations: {
						Owner: {
							belongs_to: 'Owner'
						}
					},
					methods: {
						active() {
							this.where({
								Committed: 1,
								Deleted: 0
							})
						}
					}
				})

				DB.table('User', {
					relations: {
						obj: {
							table: 'Object',
							on: (User, obj) => [User('ObjectID'), obj('ID')]
						},
						account: {
							through: 'obj',
							relation: 'Owner',
						}
					}
				})
			})


			it ("can join and use related tables", function () {
				test(
					DB('User')
						.select('ID')
						.join('account', (Owner) => Owner.active()),

					"select `t1`.`ID` from `User` as `t1`",
					"inner join `Object` as `t2` on `t1`.`ObjectID` = `t2`.`ID`",
					"inner join `Owner` as `t3` on `t2`.`OwnerID` = `t3`.`ID`",
					"inner join `Object` as `t4` on `t3`.`ObjectID` = `t4`.`ID`",
					"where `t4`.`Committed` = 1 and `t4`.`Deleted` = 0"
				)
			});


			it ("makes each table and relation available in the #query() block", function () {
				test(
					DB('User')
						.join('account', function (account) {
							account.select('Name').join('Object')
						})
						.query(function (query, User) {
							query
								.where(User('Name'), '>', User.account('Name'))
								.where(User.account.Object('Name'), 'foo')
						}),

					"select `t3`.`Name` from `User` as `t1`",
					"inner join `Object` as `t2` on `t1`.`ObjectID` = `t2`.`ID`",
					"inner join `Owner` as `t3` on `t2`.`OwnerID` = `t3`.`ID`",
					"inner join `Object` as `t4` on `t3`.`ObjectID` = `t4`.`ID`",
					"where `t1`.`Name` > 't3.Name'",
					"and `t4`.`Name` = 'foo'"
				)
			});
		})


		context("with manual join function", function () {
			beforeEach(function () {
				DB.table('Phone')
				DB.table('Person', {
					relations: {
						primary_Phone: {
							table: 'Phone',
							join: function (q, Person, Phone) {
								q.on(Person('ID'), Phone('PersonID'))
								q.on(Phone('DefaultNumber'), 1)
							}
						}
					}
				})
			})

			it ("uses the join function instead", function () {
				let query = DB('Person').join('primary_Phone', function (Phone) {
					Phone.select('Number')
				})

				test(
					query,
					"select `t2`.`Number` from `Person` as `t1` inner join `Phone` as `t2` on `t1`.`ID` = `t2`.`PersonID` and `t2`.`DefaultNumber` = 1"
				)
			})
		})



		context ("manual query function inside a relation", function () {
			// sometimes, you need to run additional tasks when you perfom a join
			beforeEach(function () {
				DB.table('Phone')
				DB.table('Person', {
					relations: {
						primary_Phone: {
							table: 'Phone',
							join: function (q, Person, Phone) {
								q.on(Person('ID'), Phone('PersonID'))
								q.on(Phone('DefaultNumber'), 1)
							},
							query: function (q, Person) {
								q.groupBy(Person('ID'))
							}
						}
					}
				})
			})

			it("runs the query callback when joined", function () {
				let query = DB('Person')
					.join('primary_Phone', function (Phone) {
						Phone.select('Number')
					})

				test(
					query,
					"select `t2`.`Number` from `Person` as `t1` inner join `Phone` as `t2` on `t1`.`ID` = `t2`.`PersonID` and `t2`.`DefaultNumber` = 1 group by `t1`.`ID`"
				)
			})
		})

		context("has_one helper", function () {
			// sometimes, you need to run additional tasks when you perfom a join
			beforeEach(function () {
				DB.table('Phone')
				DB.table('Person', {
					relations: {
						Phone: {
							has_one: 'Phone',
						}
					}
				})
			})

			it("joins the other table, and does NOT group by the parent ID", function () {
				let query = DB('Person')
					.join('Phone', function (Phone) {
						Phone.select('Number')
					})

				test(
					query,
					"select `t2`.`Number` from `Person` as `t1` inner join `Phone` as `t2` on `t1`.`ID` = `t2`.`PersonID`"
				)
			})
		})
	});



	describe ("#get_foreign_keys()", function () {
		it ("lists all the forgeign keys in a table, using its relation (belong_to) or manually defined relations", function () {
			DB.table('regGroup')
			DB.table('regMember', {
				foreign_keys: ['UserModelLevelID'],
				relations: {
					regGroup: {
						belongs_to: 'regGroup'
					},
					parent: {
						table: 'regMember',
						on: {self: 'ParentMemberID'}
					},
				}
			})

			assert.deepEqual(DB('regMember').get_foreign_keys(), ['UserModelLevelID', 'regGroupID', 'ParentMemberID'] )
		})
	})


});



function test(query, ...sql) {
	assert.equal( query.toString(), sql.join(' ') )
}

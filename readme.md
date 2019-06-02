# Database Mapper

A declarative database query builder and mapper compatible with Knex.

## Installation

```
npm install --save database-mapper
```

## Why?

SQL is an excellent, purpose built language for querying relational data. We can't make it better by hiding it behind alternative syntax pretending to be "object oriented". Relational data is just not the same as objects. But writing literal SQL for an app comes with some common problems, many of which Knex solves - nameley, by providing a composable query builder which allows us to construct SQL programatically and logically, rather than strictly bound to the syntax fules of SQL.

Database Mapper takes this one more step, by allowing us to document our knowledge of the database structure, while not forcing us to abandon a simple query builder like knex.

Database Mapper does not attempt to become a model layer, or a wide ranging abstraction layer. Rather, it seeks to provide tools to document our knowledge of table relationships, and query scopes in a reusable fashion, in order to better embrace simple queries.

## Docs?

You can find the full documentation by reading through the spec: `lib/database-mapper.spec.js`


## ISC License (ISC)
Copyright 2019 Shane Kuester

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`
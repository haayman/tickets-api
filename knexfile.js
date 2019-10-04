// Update with your config settings.

// module.exports = {

//   development: {
//     client: 'sqlite3',
//     connection: {
//       filename: '../data/knex.sqlite3'
//     },
//     debug: true,
//     useNullAsDefault: true
//   }

// };

module.exports = {
  development: {
    client: 'mysql',
    connection: {
      host: 'localhost',
      user: 'plusleo',
      database: 'plusleo_tickets_dev',
      password: 'lekker grote database'

    }
  },
  test: {
    client: 'mysql',
    connection: {
      host: 'localhost',
      user: 'plusleo',
      database: 'plusleo_tickets_test',
      password: 'lekker grote database'

    }
  },


}

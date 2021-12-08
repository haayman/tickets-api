const path = require('path');

module.exports = {
  name: 'PlusLeo tickets',
  database: {
    client: 'mysql',
    connection: {
      host: 'hostname',
      user: 'user',
      database: 'database',
      password: 'password'

    },
    debug: false
  },

  payment: {
    mollie_key: "mollie-key"
  },

  server: {
    url: 'https://mydomain.nl',
    port: 3001
  },

  jwtPrivateKey: "Dit is de sleutel waarmee de signon package wordt versleuteld",
  mail_transport: {
    debug: false,
    // logger: true,
    sendmail: true,
    path: '/usr/sbin/sendmail'
  },
  email: {
    afzender: 'Afzender',
    afzender_email: 'info@mydomain.nl',
    //alwaysTo: "arjen.haayman@gmail.com",
    bcc: 'info@mydomain.nl',
    subject_prefix: '[Prefix]'
  },

  // // mail-adres voor teruggave-verzoeken
  // penningmeester: 'penningmeester@plusleo.nl',

  // aantal dagen
  teruggave_termijn: 14
};

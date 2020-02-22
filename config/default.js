const path = require('path');

module.exports = {
  name: 'PlusLeo tickets',
  database: {
    client: 'mysql',
    connection: {
      host: 'linux',
      user: 'plusleo',
      database: 'plusleo_tickets',
      password: 'lekker grote database'

    },
    debug: false
  },

    namespace: "PlusLeoDbNamespace", // t.b.v transacties
  jwtPrivateKey: "Dit is de sleutel waarmee de signon package wordt versleuteld",
  server: {
    url: 'https://kaarten.plusleo.nl',
    port: 3000
  },
  mail_transport: {
    debug: false,
    // logger: true,
    sendmail: true,
    path: '/usr/sbin/sendmail'
  },
  email: {
    afzender: 'PlusLeo',
    afzender_email: 'info@plusleo.nl',
    //    alwaysTo: "arjen.haayman@gmail.com",
    subject_prefix: '[PlusLeo]'
  },

  // mail-adres voor teruggave-verzoeken
  penningmeester: 'penningmeester@plusleo.nl',

  // aantal dagen
  teruggave_termijn: 14
};

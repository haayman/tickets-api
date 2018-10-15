const path = require("path");

module.exports = {
  name: "My app (live)",
  // database: {
  //   name: "production",
  //   connection:
  //     "mongodb+srv://arjen:LG86_jvif5pzD4t@plusleo-zpubl.gcp.mongodb.net/reserveren?retryWrites=true"
  // },
  database: {
    dialect: "sqlite",
    storage: path.resolve(__dirname, "..", "data", "tickets.sqlite"),
    define: {
      charset: "utf8",
      dialectOptions: {
        collate: "utf8_general_ci"
      },
      timestamps: true,
      freezeTableName: true
    },
    sync: {
      force: true
    }
  },
  jwtPrivateKey:
    "Dit is de sleutel waarmee de signon package wordt versleuteld",
  server: {
    port: 3000
  },
  // mail_transport: {
  //   sendmail: true,
  //   path: "/usr/sbin/sendmail"
  // },
  email: {
    afzender: "PlusLeo",
    afzender_email: "info@plusleo.nl",
    alwaysTo: "arjen.haayman@gmail.com",
    subjects: {
      paymentFailure: "Betaling mislukt",
      gewijzigd: "nieuw ticket {1}",
      wachtlijst: "Je staat op de wachtlijst",
      confirmationPayment: "ticket {1}",
      uit_wachtlijst: "ticket {1}"
    }
  },

  // aantal dagen
  teruggave_termijn: 14
};

const jwt = require("jsonwebtoken");
const config = require("config");
const Password = require('objection-password')();
const ROLES = ["admin", "speler", "kassa"];
const crypto = require("crypto");
const differenceInMinutes = require('date-fns/difference_in_minutes');
const TimestampedModel = require('./TimestampedModel');


module.exports = class User extends Password(TimestampedModel) {
  static get tableName() {
    return 'users'
  };

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['username', 'name', 'email', 'password', 'role'],
      properties: {
        id: {
          type: 'integer'
        },
        username: {
          type: 'string'
        },
        name: {
          type: 'string'
        },
        email: {
          type: 'email',
          format: 'email'
        },
        password: {
          type: 'string'
        },
        role: {
          type: 'string',
          enum: ROLES
        }
      }
    }
  }

  /**
   * 
   * @param {string} password 
   * @returns {Promise}
   */
  checkPassword(password) {
    // verifyPassword is toegevoegd door Password
    return this.verifyPassword(password);
  }

  getAuthToken() {
    return jwt.sign({
        id: this.id,
        role: this.role,
        timestamp: new Date()
      },
      config.get("jwtPrivateKey")
    );
  }

  /**
   * determines whether timestamp is older than 60 minutes
   * @param {*} timestamp 
   */
  static tokenExpired(timestamp) {
    return differenceInMinutes(new Date(), new Date(timestamp)) >= 60;
  }

  getEditLink() {
    return (
      config.get('server.url') +
      "/forgotten/" +
      this.id +
      "/" +
      this.getHash()
    );
  }

  getHash() {
    return (
      crypto
      .createHash("sha1")
      .update("" + this.id) // convert to string
      .update(this.email)
      // .update(this.password)
      .digest("hex")
    );
  }

  isAdministrator() {
    return this.role === "admin";
  }

  isSpeler() {
    return this.role === "speler" || this.isAdministrator();
  }

  isKassa() {
    return this.role === "kassa";
  }

  isAuthorized(authorizationRequired) {
    switch (authorizationRequired) {
      case true:
        return true;
      case "admin":
        return this.isAdministrator();
      case "speler":
        return this.isSpeler();
      case "kassa":
        return this.isKassa();
    }
  }

}

// let User = sequelize.define(
//   "User", {
//     username: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true,
//       set(val) {
//         this.setDataValue("username", val.toLowerCase());
//       }
//     },
//     name: {
//       type: DataTypes.STRING,
//       allowNull: false
//     },
//     email: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true,
//       validate: {
//         isEmail: true
//       }
//     },
//     password: {
//       type: DataTypes.TEXT,
//       allowNull: false
//     },
//     role: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       validate: {
//         isRole(value) {
//           if (!ROLES.includes(value)) {
//             throw new Error(`ongeldige rol: ${value}`);
//           }
//         }
//       }
//     }
//   }, {
//     defaultScope: {
//       attributes: {
//         exclude: ["password"]
//       }
//     },
//     scopes: {
//       withPassword: {
//         attributes: {
//           include: ["password"]
//         }
//       }
//     },
//     hooks: {
//       beforeSave: function (user) {
//         return new Promise((resolve, reject) => {
//           if (!user.changed("password")) resolve();
//           // geen wachtwoord, maar wel een bestaande? OK
//           if (!user.password) resolve();
//           hashPassword(user.password).hash((error, hash) => {
//             if (error) reject(new Error(error));
//             else {
//               user.password = hash;
//               resolve();
//             }
//           });
//         });
//       }
//     }
//   }
// );

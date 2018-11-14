const jwt = require("jsonwebtoken");
const config = require("config");
const hashPassword = require("password-hash-and-salt");
const ROLES = ["admin", "speler", "kassa"];
const crypto = require("crypto");
const globalData = require('../components/globalData');
const differenceInMinutes = require('date-fns/difference_in_minutes');

module.exports = (sequelize, DataTypes) => {
  let User = sequelize.define(
    "User", {
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        set(val) {
          this.setDataValue("username", val.toLowerCase());
        }
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      password: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isRole(value) {
            if (!ROLES.includes(value)) {
              throw new Error(`ongeldige rol: ${value}`);
            }
          }
        }
      }
    }, {
      defaultScope: {
        attributes: {
          exclude: ["password"]
        }
      },
      scopes: {
        withPassword: {
          attributes: {
            include: ["password"]
          }
        }
      },
      hooks: {
        beforeSave: function (user) {
          return new Promise((resolve, reject) => {
            if (!user.changed("password")) resolve();
            // geen wachtwoord, maar wel een bestaande? OK
            if (!user.password) resolve();
            hashPassword(user.password).hash((error, hash) => {
              if (error) reject(new Error(error));
              else {
                user.password = hash;
                resolve();
              }
            });
          });
        }
      }
    }
  );

  User.prototype.checkPassword = function (password) {
    // let user = this;
    return new Promise((resolve, reject) => {
      hashPassword(password).verifyAgainst(
        this.getDataValue("password"),
        function (error, verified) {
          if (error) reject(error);
          else resolve(verified);
        }
      );
    });
  };

  User.prototype.getAuthToken = function () {
    return jwt.sign({
        id: this.getDataValue("id"),
        role: this.getDataValue("role"),
        timestamp: new Date()
      },
      config.get("jwtPrivateKey")
    );
  };

  User.prototype.tokenExpired = function (token) {
    return differenceInMinutes(new Date(), token.timestamp) >= 15;
  }

  User.prototype.getEditLink = function () {
    return (
      config.get('server.url') +
      "/forgotten/" +
      this.getDataValue("id") +
      "/" +
      this.getHash()
    );
  };

  User.prototype.getHash = function () {
    return (
      crypto
      .createHash("sha1")
      .update("" + this.id) // convert to string
      .update(this.email)
      // .update(this.password)
      .digest("hex")
    );
  };

  User.prototype.isAdministrator = function () {
    return this.role === "admin";
  }

  User.prototype.isSpeler = function () {
    return this.role === "speler" || this.isAdministrator();
  }

  User.prototype.isKassa = function () {
    return this.role === "kassa";
  }

  User.prototype.isAuthorized = function (authorizationRequired) {
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

  return User;
};
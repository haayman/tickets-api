const jwt = require("jsonwebtoken");
const config = require("config");
const hashPassword = require("password-hash-and-salt");
const ROLES = ["admin", "speler", "kassa"];
const crypto = require("crypto");

module.exports = (sequelize, DataTypes) => {
  let User = sequelize.define(
    "User",
    {
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
        type: DataTypes.TEXT
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isRole(value) {
            return ROLES.includes(value);
          }
        }
      }
    },
    {
      defaultScope: {
        attributes: { exclude: ["password"] }
      },
      scopes: {
        withPassword: {
          attributes: { include: ["password"] }
        }
      },
      hooks: {
        beforeSave: function(user) {
          return new Promise((resolve, reject) => {
            if (!user.changed("password")) resolve();
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

  User.prototype.checkPassword = function(password) {
    // let user = this;
    return new Promise((resolve, reject) => {
      hashPassword(password).verifyAgainst(
        this.getDataValue("password"),
        function(error, verified) {
          if (error) reject(error);
          else resolve(verified);
        }
      );
    });
  };

  User.prototype.getAuthToken = function() {
    return jwt.sign(
      {
        id: this.getDataValue("id"),
        role: this.getDataValue("role")
      },
      config.get("jwtPrivateKey")
    );
  };

  User.prototype.getEditLink = function() {
    return (
      config.get("server.url") +
      "/forgotten/" +
      this.getDataValue("id") +
      "/" +
      this.getHash()
    );
  };

  User.prototype.getHash = function() {
    return (
      crypto
        .createHash("sha1")
        .update("" + this.id) // convert to string
        .update(this.email)
        // .update(this.password)
        .digest("hex")
    );
  };

  return User;
};

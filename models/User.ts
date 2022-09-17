import jwt from "jsonwebtoken";
import config from "config";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import differenceInMinutes from "date-fns/differenceInMinutes";
import {
  BeforeCreate,
  BeforeUpdate,
  Entity,
  Enum,
  EventArgs,
  Filter,
  Index,
  ManyToOne,
  OneToMany,
  OnInit,
  PrimaryKey,
  Property,
  wrap,
} from "@mikro-orm/core";
import { v4 } from "uuid";
import winston from "winston";

export type IRole = "admin" | "speler" | "kassa";

export type IUser = {
  id?: string;
  username: string;
  name: string;
  password?: string;
  email: string;
  role: IRole;
};

@Entity({ tableName: "users" })
export class User {
  private tmpPassword: string;

  @PrimaryKey()
  public id = v4();

  @Property()
  @Index()
  username!: string;

  @Property({ hidden: true })
  password!: string;

  @Property()
  name!: string;

  @Property()
  email!: string;

  @Enum({ items: ["admin", "speler", "kassa"] })
  role!: IRole;

  // constructor(username, name, email, password, role) {
  //   this.username = username;
  //   this.name = name;
  //   this.email = email;
  //   this.password = password;
  //   this.role = role;
  // }

  /**
   *
   * @param {string} password
   * @returns {Promise}
   */
  async checkPassword(password) {
    const valid = await bcrypt.compare(password, this.password);
    return valid;
  }

  @BeforeUpdate()
  @BeforeCreate()
  async testPassword(args: EventArgs<this>) {
    if (args.changeSet?.payload?.password) {
      await this.hashPassword();
    }
  }

  async hashPassword() {
    const SALT_FACTOR = 5;

    try {
      const salt = await bcrypt.genSalt(SALT_FACTOR);
      const hash = await bcrypt.hashSync(this.password, salt);

      this.password = hash;
    } catch (e) {
      winston.error(e);
      throw e;
    }
  }

  getAuthToken() {
    return jwt.sign(
      {
        id: this.id,
        role: this.role,
        timestamp: new Date(),
      },
      config.get("jwtPrivateKey")
    );
  }

  /**
   * determines whether timestamp is older than 60 minutes
   * @param {*} timestamp
   */
  tokenExpired(timestamp: number): boolean {
    return differenceInMinutes(new Date(), new Date(timestamp)) >= 60;
  }

  getEditLink() {
    return (
      config.get("server.url") + "/forgotten/" + this.id + "/" + this.getHash()
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

  static fromJson(json: IUser): User {
    const user = new User();
    for (const key in json) {
      user[key] = json[key];
    }
    return user;
  }

  static hasRole(role: string, requiredRole: string) {
    const roles = {
      speler: ["speler"],
      admin: ["admin", "speler"],
      kassa: ["kassa"],
    };
    return roles[role]?.includes(requiredRole);
  }
}

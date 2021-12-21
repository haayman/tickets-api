import jwt from "jsonwebtoken";
import config from "config";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import differenceInMinutes from "date-fns/differenceInMinutes";
import {
  BeforeCreate,
  BeforeUpdate,
  Entity,
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

  @Property()
  role!: "admin" | "speler" | "kassa";

  /**
   *
   * @param {string} password
   * @returns {Promise}
   */
  checkPassword(password) {
    return bcrypt.compare(password, this.password);
  }

  @OnInit()
  loadPassword() {
    this.tmpPassword = this.password;
  }

  @BeforeUpdate()
  async testPassword() {
    if (this.tmpPassword !== this.password) {
      this.hashPassword();
    }
  }

  async hashPassword() {
    const SALT_FACTOR = 5;

    try {
      const salt = await bcrypt.genSalt(SALT_FACTOR);
      const hash = bcrypt.hashSync(this.password, salt);

      this.password = hash;
    } catch (e) {
      console.error(e);
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
}

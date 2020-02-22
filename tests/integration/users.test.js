jest.setTimeout(3000000);
const request = require('supertest');
let app = require('../../app');
const User = require('../../models/User');
const getAuthToken = require('../getAuthToken');

let authToken;

beforeAll(async () => {
  authToken = getAuthToken();
});

beforeEach(async () => {
  await User.query().delete();
});

describe('/api/user', () => {
  describe('/GET', () => {
    it('should return all users', async () => {
      try {
        const users = [
          {
            username: 'user1',
            name: 'User 1',
            email: 'user@plusleo.nl',
            password: 'test1',
            role: 'speler'
          },
          {
            username: 'user2',
            name: 'User 2',
            email: 'user2@plusleo.nl',
            password: 'test2',
            role: 'speler'
          }
        ];
        await Promise.all(
          users.map(async (user) => {
            user = await User.query().insertAndFetch(user);
          })
        );
      } catch (ex) {
        console.log(ex);
      }
      const res = await request(app)
        .get('/api/user')
        .set('x-auth-token', authToken);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some((u) => u.username === 'user1')).toBeTruthy();
      expect(res.body.some((u) => u.username === 'user2')).toBeTruthy();
    });

    describe('/GET/id', () => {
      it('should return specific user', async () => {
        let user = await User.query().insertAndFetch({
          username: 'user1',
          name: 'User 1',
          email: 'user@plusleo.nl',
          password: 'test1',
          role: 'speler'
        });

        debugger;
        const id = user.id;
        const res = await request(app)
          .get('/api/user/' + id)
          .set('x-auth-token', authToken);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(id);
      });

      it('should return 404 not found', async () => {
        const res = await request(app)
          .get('/api/user/0')
          .set('x-auth-token', authToken); // valid objectid
        expect(res.status).toBe(404);
      });
    });
  });
  describe('/POST', () => {
    // --------- validation errors -----

    it('should fail validation. password missing return 400', async () => {
      const res = await request(app)
        .post('/api/user/')
        .set('x-auth-token', authToken)
        .send({
          username: 'user1',
          name: 'User 1',
          email: 'user1@plusleo.nl',
          // password: "Dit is een goed",
          role: 'speler'
        });
      expect(res.status).toBe(400);
    });

    it('should fail validation. invalid role. return 400', async () => {
      const res = await request(app)
        .post('/api/user/')
        .set('x-auth-token', authToken)
        .send({
          username: 'user1',
          name: 'User 1',
          email: 'user1@plusleo.nl',
          password: 'Dit is een goed',
          role: 'role'
        });
      expect(res.status).toBe(400);
    });

    it('User already exists. return 400', async () => {
      await request(app)
        .post('/api/user/')
        .set('x-auth-token', authToken)
        .send({
          username: 'user1',
          name: 'User 1',
          email: 'user1@plusleo.nl',
          password: 'Dit is een goed',
          role: 'role'
        });
      const res = await request(app)
        .post('/api/user/')
        .set('x-auth-token', authToken)
        .send({
          username: 'user1',
          name: 'User 1',
          email: 'user1@plusleo.nl',
          password: 'Dit is een goed',
          role: 'role'
        });

      expect(res.status).toBe(400);
    });

    it('should successfully post', async () => {
      const res = await request(app)
        .post('/api/user/')
        .set('x-auth-token', authToken)
        .send({
          username: 'user1',
          name: 'User 1',
          email: 'user1@plusleo.nl',
          password: 'Dit is een goed',
          role: 'speler'
        });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.header).toHaveProperty('x-auth-token');

      const user = await User.query().where({
        username: 'user1'
      });
      expect(user).not.toBeNull();
    });
  });
});

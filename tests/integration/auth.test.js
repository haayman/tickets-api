const request = require('supertest');
let app = require('../../app');
const getAuthToken = require('../getAuthToken');

let spelerToken, adminToken;

beforeAll(async () => {
  adminToken = getAuthToken('admin');
  spelerToken = getAuthToken('speler');
});

describe('auth middleware', () => {
  it('should return 401. no x-auth-token', async () => {
    const res = await request(app).get('/api/user');
    expect(res.status).toBe(401);
  });

  it('should return 403. wrong role', async () => {
    const res = await request(app)
      .get('/api/user')
      .set('x-auth-token', spelerToken);
    expect(res.status).toBe(403);
  });

  it('should return 200. access allowed', async () => {
    const res = await request(app)
      .get('/api/user')
      .set('x-auth-token', adminToken);
    expect(res.status).toBe(200);
  });
});

const ROOT = process.env.ROOT;
const root = './';
require('axios-debug-log');
const nock = require('nock');

const nodemailerMock = require('nodemailer-mock');
jest.setMock('nodemailer', nodemailerMock);
require('./mollie-mock');

const { Reservering, Voorstelling } = require(`${ROOT}/models/`);

beforeAll(async () => {
  await Voorstelling.query().delete();
});

beforeEach(async () => {
  // console.log("delete reservering");
  await Reservering.query().delete();
  nodemailerMock.mock.reset();
  nock.cleanAll();
});

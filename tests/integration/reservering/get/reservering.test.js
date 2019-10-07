jest.setTimeout(3000000);
const root = '../'
process.env.NODE_CONFIG_DIR = __dirname + `${root}../../../../config/`;
process.env.NODE_ENV = 'test';
const request = require("supertest");
require('axios-debug-log');

process.env.DEBUG = 'axios';

let app = require(`${root}../../../app`);
const {
  Reservering,
  Voorstelling,
} = require(`${root}../../../models/`);
const getAuthToken = require(`${root}/getAuthToken`);
const createVoorstelling = require(`${root}/createVoorstelling`);

let authToken,	voorstelling;

beforeAll(async () => {
	await Voorstelling.query().delete();
	voorstelling = await createVoorstelling();
	authToken = await getAuthToken();
	// console.log('beforeAll', voorstelling);
});

beforeEach(async () => {
  // console.log("delete reservering");
  await Reservering.query().delete();
});

describe("/reservering", async () => {
  describe("/get", async () => {
			beforeEach(async () => {

				const reserveringen = [{
						naam: "naam1",
						email: "naam1@plusleo.nl",
						uitvoeringId: voorstelling.uitvoeringen[0].id,
						tickets: [{
							prijsId: voorstelling.prijzen[0].id
						}]
					},
					{
						naam: "naam2",
						email: "naam@plusleo.nl",
						uitvoeringId: voorstelling.uitvoeringen[0].id,
						tickets: [{
							prijsId: voorstelling.prijzen[1].id
						}]
					}
				]
				await Promise.all(reserveringen.map(async (reservering) => {
					await Reservering.query().insertGraph(reservering);
				}));
		})

		it("should return alle reserveringen", async () => {
      const res = await request(app)
        .get("/api/reservering")
        .set("x-auth-token", authToken);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some(u => u.naam === "naam1")).toBeTruthy();
			expect(res.body.some(u => u.naam === "naam2")).toBeTruthy();
		});

		it("should return not authorized", async (done) => {
      const res = await request(app)
        .get("/api/reservering")
			expect(res.status).toBe(401);
			done();
		});

	});

	describe("/get/id", async () => {
		it("should return specific reservering", async () => {
			let reservering;
			try {
				reservering = await Reservering.query().insert({
					naam: "naam3",
					email: "naam3@plusleo.nl",
					uitvoeringId: voorstelling.uitvoeringen[0].id
				});
			} catch (ex) {
				//console.log(ex);
				throw (ex)
			}

			const id = reservering.id;
			const res = await request(app)
				.get("/api/reservering/" + id)
				.set("x-auth-token", authToken);
			expect(res.status).toBe(200);
			expect(res.body.id).toBe(id);
		});

		it("should return 404 not found", async (done) => {
			const res = await request(app)
				.get("/api/reservering/1")
				.set("x-auth-token", authToken);
			expect(res.status).toBe(404);
			done();
		});


	});
});

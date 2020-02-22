const request = require('supertest');
let app = require('../../../app');
const Voorstelling = require('../../../models/Voorstelling');
const getAuthToken = require('../../getAuthToken');

let authToken;

beforeAll(async () => {
  authToken = getAuthToken();
});

beforeEach(async () => {
  await Voorstelling.query().delete();
});

describe('/api/voorstelling', () => {
  describe('/GET', () => {
    const query = () =>
      Voorstelling.query().allowGraph('[prijzen,uitvoeringen]');

    it('should return all voorstellingen', async () => {
      try {
        await query().insertGraph([
          {
            title: 'title1',
            description: 'Description 1',
            active: true,
            url: 'https://plusleo.nl/',
            locatie: 'locatie 1',
            opmerkingen: 'opmerkingen1',
            prijzen: [],
            uitvoeringen: []
          },
          {
            title: 'title2',
            description: 'Description 2',
            active: true,
            url: 'https://plusleo.nl/',
            locatie: 'locatie 2',
            opmerkingen: 'opmerkingen2',
            prijzen: [],
            uitvoeringen: []
          }
        ]);
      } catch (ex) {
        console.log(ex);
        throw ex;
      }
      const res = await request(app).get('/api/voorstelling');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some((u) => u.title === 'title1')).toBeTruthy();
      expect(res.body.some((u) => u.title === 'title2')).toBeTruthy();
    });

    describe('/GET/id', () => {
      it('should return specific voorstelling', async () => {
        let voorstelling = await query().insertGraphAndFetch({
          title: 'title1',
          description: 'Description 1',
          active: true,
          url: 'https://plusleo.nl/',
          locatie: 'locatie 1',
          opmerkingen: 'opmerkingen1',
          prijzen: [],
          uitvoeringen: []
        });

        const id = voorstelling.id;
        const res = await request(app).get('/api/voorstelling/' + id);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(id);
      });

      it('should return 404 not found', async () => {
        const res = await request(app).get('/api/voorstelling/0');
        expect(res.status).toBe(404);
      });
    });
  });

  describe('/POST', () => {
    // --------- validation errors -----

    it('should fail. No Access. return 401', async () => {
      const res = await request(app)
        .post('/api/voorstelling/')
        .send({
          title: 'title1',
          description: 'Description 1',
          active: true,
          url: 'https://plusleo.nl/',
          locatie: 'locatie 1',
          opmerkingen: 'opmerkingen1',
          prijzen: [],
          uitvoeringen: []
        });
      expect(res.status).toBe(401);
    });

    it('should fail. Speler has no access. return 403', async () => {
      const speler = getAuthToken('speler');
      const res = await request(app)
        .post('/api/voorstelling/')
        .set('x-auth-token', speler)
        .send({
          title: 'title1',
          description: 'Description 1',
          active: true,
          url: 'https://plusleo.nl/',
          locatie: 'locatie 1',
          opmerkingen: 'opmerkingen1',
          prijzen: [],
          uitvoeringen: []
        });
      expect(res.status).toBe(403);
    });

    it('should fail validation. missing description. return 400', async () => {
      const res = await request(app)
        .post('/api/voorstelling/')
        .set('x-auth-token', authToken)
        .send({
          title: 'title1',
          // description: "Description 1",
          active: true,
          url: 'https://plusleo.nl/',
          locatie: 'locatie 1',
          opmerkingen: 'opmerkingen1',
          prijzen: [],
          uitvoeringen: []
        });
      expect(res.status).toBe(400);
    });

    it('should fail validation. missing prijs.description. return 400', async () => {
      const res = await request(app)
        .post('/api/voorstelling/')
        .set('x-auth-token', authToken)
        .send({
          title: 'title1',
          description: 'Description 1',
          active: true,
          url: 'https://plusleo.nl/',
          locatie: 'locatie 1',
          opmerkingen: 'opmerkingen1',
          prijzen: [
            {
              // description: "volwassenen",
              prijs: 10
            }
          ],
          uitvoeringen: []
        });
      expect(res.status).toBe(400);
    });

    // it('should fail validation. uitvoering.aantal_plaatsen<1. return 400', async () => {
    //   const res = await request(app)
    //     .post('/api/voorstelling/')
    //     .set('x-auth-token', authToken)
    //     .send({
    //       title: 'title1',
    //       description: 'Description 1',
    //       active: true,
    //       url: 'https://plusleo.nl/',
    //       locatie: 'locatie 1',
    //       opmerkingen: 'opmerkingen1',
    //       prijzen: [],
    //       uitvoeringen: [
    //         {
    //           aanvang: new Date(2018, 1, 1),
    //           deur_open: new Date(2018, 1, 1),
    //           aantal_plaatsen: -1
    //         }
    //       ]
    //     });
    //   expect(res.status).toBe(400);
    // });

    it('should successfully post', async () => {
      const res = await request(app)
        .post('/api/voorstelling/')
        .set('x-auth-token', authToken)
        .send({
          title: 'title1',
          description: 'Description 1',
          active: true,
          url: 'https://plusleo.nl/',
          locatie: 'locatie 1',
          opmerkingen: 'opmerkingen1',
          prijzen: [],
          uitvoeringen: []
        });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();

      const voorstelling = await Voorstelling.query().where({
        title: 'title1'
      });
      expect(voorstelling).not.toBeNull();
    });
  });
});

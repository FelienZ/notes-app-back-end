const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');
const path = require('path')

const notes = require('./api/notes');
const NotesService = require('./services/postgres/NotesService');
const NotesValidator = require('./validator/notes');

const ClientError = require('./exceptions/ClientError');

const UsersService = require('./services/postgres/UsersService');
const users = require('./api/users');
const UsersValidator = require('./validator/users');

const authentications = require('./api/authentications');
const AuthenticationsService = require('./services/postgres/AuthenticationsService');
const AuthenticationsValidator = require('./validator/authentications');
const TokenManager = require('./tokenize/tokenManager');

const collaborations = require('./api/collaborations');
const CollaborationsService = require('./services/postgres/CollaborationsService');
const CollaborationsValidator = require('./validator/collaborations');

const _exports = require('./api/exports');
const producerService = require('./services/rabbitMQ/producerService');
const ExportValidator = require('./validator/export');

const uploads = require('./api/uploads');
const uploadsValidator = require('./validator/uploads');
// const storageServices = require('./services/storage/storageServices');
const storageServices = require('./services/S3/StorageServices');
const inert = require('@hapi/inert');

const CacheService = require('./services/redis/CacheServices');


require('dotenv').config();
const init = async () =>{
  const cacheService = new CacheService()
  const collaborationsService = new CollaborationsService(cacheService);
  const notesService = new NotesService(collaborationsService, cacheService);
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  // const storageService = new storageServices(path.resolve(__dirname, 'api/uploads/file/images'));
  const storageService = new storageServices();
  // console.log(storageService)
  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes:{
      cors:{
        origin: ['*'],
      },
    },
  });
  await server.register([
    {
      plugin: Jwt,
    },
    {
      plugin: inert
    }
  ]);
  server.auth.strategy('notesapp_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });
  await server.register([
    {
      plugin: notes,
      options:{
        service: notesService,
        validator: NotesValidator
      },
    },
    {
      plugin: users,
      options:{
        service: usersService,
        validator: UsersValidator
      }
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: collaborations,
      options: {
        collaborationsService,
        notesService,
        validator: CollaborationsValidator,
      },
    },
    {
      plugin: _exports,
      options:{
        service: producerService,
        validator: ExportValidator
      }
    },
    {
      plugin: uploads,
      options: {
        service: storageService,
        validator: uploadsValidator
      }
    }
  ]);
  server.ext('onPreResponse', (request, h) => {
    // mendapatkan konteks response dari request
    const { response } = request;

    // penanganan client error secara internal.
    if (response instanceof ClientError) {
      const newResponse = h.response({
        status: 'fail',
        message: response.message,
      });
      newResponse.code(response.statusCode);
      return newResponse;
    }

    return h.continue;
  });
  await server.start();
  console.log(`Server Berjalan di ${server.info.uri}`);
};

init();
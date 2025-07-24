const Hapi = require('@hapi/hapi');
const notes = require('./api/notes');
const NotesService = require('./services/postgres/NotesService');
const NotesValidator = require('./validator/notes');
const ClientError = require('./exceptions/ClientError');
const UsersService = require('./services/postgres/UsersService');
const users = require('./api/users');
const UsersValidator = require('./validator/users');


require('dotenv').config();
const init = async () =>{
  const notesService = new NotesService();
  const usersService = new UsersService();
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
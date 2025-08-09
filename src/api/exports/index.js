const ExportsHandler = require('./handler');
const routes = require('./routes');
 
module.exports = {
  name: 'exports',
  version: '1.0.0',
  register: async (server, { service, validator }) => {
    const exportsHandler = new ExportsHandler(service, validator);
    // console.log('export service: ', service)
    server.route(routes(exportsHandler));
  },
};
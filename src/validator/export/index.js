const InvariantError = require('../../exceptions/InvariantError');
const ExportPayloadSchema = require('./schema');

const ExportValidator = {
  validateExportNotesPayload: (payload) =>{
    const validationResult = ExportPayloadSchema.validate(payload);
    if (validationResult.error){
      throw new InvariantError(validationResult.error.message);
    }
  }

};

module.exports = ExportValidator;
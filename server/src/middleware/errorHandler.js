const HttpError = require('../utils/httpError');
const env = require('../config/env');

function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  // Unknown error: log it on the server, but never leak internals to the client.
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    ...(env.NODE_ENV === 'development' ? { debug: err.message } : {}),
  });
}

module.exports = { notFound, errorHandler };

const HttpError = require('../utils/httpError');

// Usage: router.post('/', validate(schema), handler)  -> validated data in req.validated
// source: 'body' | 'query' | 'params'
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new HttpError(400, 'Validation failed', details));
  }
  req.validated = result.data;
  next();
};

module.exports = validate;

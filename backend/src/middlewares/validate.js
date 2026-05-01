export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return res.status(409).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.issues.map((e) => ({
        field: e.path[0],
        message: e.message,
      })),
    });
  }

  // req.query is read-only in Express — we cannot reassign it.
  // Instead we attach the validated data to req.validated
  // so the controller can access it cleanly.
  // For body we can still reassign directly since it is writable.
  if (source === 'body') {
    req.body = result.data;
  } else {
    // req.validated is a custom property we add ourselves —
    // Express does not use it so we are free to set it
    req.validated = result.data;
  }

  next();
};
/**
 * Catch-all for requests that matched NO route.
 * Registered after every real route so unmatched URLs get a clean 404
 * instead of an HTML error page.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: [],
  });
};

module.exports = notFoundHandler;

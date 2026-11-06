/**
 * Express application (exported WITHOUT listen, so Supertest can import it).
 * server.js is the only place that actually starts the HTTP server.
 *
 * Middleware order matters:
 *   security -> parsing -> rate limiting -> docs -> routes -> 404 -> errors
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');

const openApiSpec = require('./docs/openapi');
const { apiReference } = require('@scalar/express-api-reference');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const jobRoutes = require('./routes/job.routes');
const analysisRoutes = require('./routes/analysis.routes');
const recommendationRoutes = require('./routes/recommendation.routes');
const aiRoutes = require('./routes/ai.routes');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit.middleware');
const notFoundHandler = require('./middleware/not-found.middleware');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// ---------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------
app.set('trust proxy', 1); // correct client IPs when running behind a reverse proxy
// contentSecurityPolicy is disabled so the Scalar UI (which loads its scripts
// from a CDN) renders correctly. All other Helmet protections stay active.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '100kb' }));

// Rate limiting is skipped in test mode (see rateLimit.middleware.js).
if (process.env.NODE_ENV !== 'test') {
  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter);
}

// ---------------------------------------------------------------------
// API documentation (no auth, not part of the JSON API)
//   /openapi.json     - machine-readable OpenAPI 3.0 specification
//   /api-reference    - human-readable Scalar UI
// ---------------------------------------------------------------------
app.get('/openapi.json', (_req, res) => res.json(openApiSpec));
app.use('/api-reference', apiReference({ spec: { content: openApiSpec } }));

// ---------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/ai', aiRoutes); // optional AI Career Coach layer (rule-based fallback built in)

/**
 * GET /api/health - server + database status for monitoring and demos.
 */
app.get('/api/health', (_req, res) => {
  // mongoose readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
  const dbConnected = mongoose.connection.readyState === 1;
  return res.status(200).json({
    success: true,
    message: dbConnected
      ? 'SkillBridge AI API is healthy'
      : 'SkillBridge AI API is running, but the database is not connected',
    data: {
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

// ---------------------------------------------------------------------
// 404 for unmatched routes, then the central error handler (always last)
// ---------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

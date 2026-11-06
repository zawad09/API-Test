/**
 * Server entry point.
 * Order: load env -> validate required env -> connect database -> listen.
 * Also registers graceful shutdown and crash handlers.
 */
require('dotenv').config();

const app = require('./app');
const { connectDatabase, closeDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Fail fast with a helpful message instead of crashing on first request.
if (!process.env.JWT_SECRET) {
  console.error('[ERROR] Startup failed: JWT_SECRET is missing.');
  console.error('        Fix: copy .env.example to .env and set a strong JWT_SECRET (e.g. run: openssl rand -hex 32).');
  process.exit(1);
}

let server;

const startServer = async () => {
  try {
    await connectDatabase();
    server = app.listen(PORT, () => {
      console.log('----------------------------------------------------------------');
      console.log('  SkillBridge AI API is running');
      console.log(`  Mode:       ${NODE_ENV}`);
      console.log(`  Local URL:  http://localhost:${PORT}`);
      console.log(`  Health:     http://localhost:${PORT}/api/health`);
      console.log(`  API docs:   http://localhost:${PORT}/api-reference`);
      console.log(`  OpenAPI:    http://localhost:${PORT}/openapi.json`);
      console.log('----------------------------------------------------------------');
    });
  } catch (error) {
    console.error(`[ERROR] Failed to start SkillBridge AI: ${error.message}`);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`\n${signal} received - shutting down gracefully...`);
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error(`[ERROR] During shutdown: ${error.message}`);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[ERROR] Unhandled promise rejection:', reason);
  shutdown('unhandledRejection');
});

startServer();

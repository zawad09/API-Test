/**
 * Database connection module.
 *
 * Primary target: MongoDB Atlas (set MONGODB_URI in .env).
 *
 * Development fallback: if MONGODB_URI is empty AND we are not in production,
 * a temporary in-memory MongoDB is started so the project can be demonstrated
 * with zero setup. Data in this mode is lost when the server stops - it is a
 * playground, not persistence.
 *
 * Automated tests ALWAYS use their own isolated in-memory database
 * (see tests/setup.js) so production data is never touched.
 */
const mongoose = require('mongoose');

const DEFAULT_DB_NAME = 'skillbridge';

const connectDatabase = async () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  let uri = process.env.MONGODB_URI;

  if (!uri) {
    if (nodeEnv === 'production') {
      throw new Error('MONGODB_URI is required when NODE_ENV=production. Set it in your environment or .env file.');
    }
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const memoryServer = await MongoMemoryServer.create();
    global.__skillbridgeMemoryServer = memoryServer; // stopped again in closeDatabase()
    uri = memoryServer.getUri();
    console.warn('[WARN] MONGODB_URI is not set - using a TEMPORARY in-memory MongoDB (development only).');
    console.warn('       Data will be lost when the server stops. Set MONGODB_URI (MongoDB Atlas) for persistent storage.');
  }

  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME,
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`[OK] MongoDB connected -> ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    console.error(`[ERROR] MongoDB connection failed: ${error.message}`);
    console.error('       Checklist: 1) Is MONGODB_URI correct?  2) Is your IP whitelisted in MongoDB Atlas (Network Access)?');
    throw error;
  }

  mongoose.connection.on('disconnected', () => console.warn('[WARN] MongoDB disconnected'));
  mongoose.connection.on('error', (err) => console.error(`[ERROR] MongoDB error: ${err.message}`));
};

const closeDatabase = async () => {
  await mongoose.disconnect();
  if (global.__skillbridgeMemoryServer) {
    await global.__skillbridgeMemoryServer.stop();
    global.__skillbridgeMemoryServer = undefined;
  }
};

module.exports = { connectDatabase, closeDatabase };

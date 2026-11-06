/**
 * Shared Jest setup.
 *
 * Every test run gets its OWN in-memory MongoDB, wiped between tests:
 * automated tests can never touch production/Atlas data, and tests stay
 * independent from each other.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-jwt-secret-for-jest';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

let mongoMemoryServer;

// Hook timeouts are generous: the first run may extract the MongoDB binary.
beforeAll(async () => {
  mongoMemoryServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoMemoryServer.getUri(), { dbName: 'skillbridge-test' });
}, 300000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
}, 300000);

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

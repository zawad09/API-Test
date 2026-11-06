/**
 * Jobs API tests (list, filter, details, error cases).
 */
const request = require('supertest');
const app = require('../src/app');
const { seedJobs } = require('../src/seed/seedJobs');
const Job = require('../src/models/Job');

describe('Jobs API', () => {
  test('GET /api/jobs - returns all 5 active seeded jobs', async () => {
    await seedJobs();
    const res = await request(app).get('/api/jobs');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(5);
    expect(res.body.data.jobs).toHaveLength(5);
    expect(res.body.data.jobs[0].requiredSkills.length).toBeGreaterThan(0);
  });

  test('GET /api/jobs?experienceLevel=beginner - filters by level', async () => {
    await seedJobs();
    const res = await request(app).get('/api/jobs?experienceLevel=beginner');

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(4); // only AI Engineer is intermediate
    res.body.data.jobs.forEach((job) => {
      expect(job.experienceLevel).toBe('beginner');
    });
  });

  test('GET /api/jobs?category=... - filters by category, case-insensitively', async () => {
    await seedJobs();
    const res = await request(app).get('/api/jobs?category=backend%20development');

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.jobs[0].title).toBe('Junior Backend Developer');
  });

  test('GET /api/jobs?experienceLevel=banana - invalid filter value returns 400', async () => {
    await seedJobs();
    const res = await request(app).get('/api/jobs?experienceLevel=banana');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/jobs/:id - returns one job with its required skills', async () => {
    await seedJobs();
    const list = await request(app).get('/api/jobs');
    const jobId = list.body.data.jobs[0]._id;

    const res = await request(app).get(`/api/jobs/${jobId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.job._id).toBe(jobId);
    expect(Array.isArray(res.body.data.job.requiredSkills)).toBe(true);
  });

  test('GET /api/jobs/:id - malformed id returns 400', async () => {
    const res = await request(app).get('/api/jobs/not-a-valid-id');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  test('GET /api/jobs/:id - well-formed but unknown id returns 404', async () => {
    const res = await request(app).get('/api/jobs/000000000000000000000000');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('inactive jobs are hidden from the list', async () => {
    await seedJobs();
    await Job.create({
      title: 'Hidden Job',
      company: 'Stealth Co',
      isActive: false,
      requiredSkills: [],
    });

    const res = await request(app).get('/api/jobs');

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(5);
    expect(res.body.data.jobs.find((j) => j.title === 'Hidden Job')).toBeUndefined();
  });
});

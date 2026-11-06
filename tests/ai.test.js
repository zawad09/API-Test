/**
 * AI Career Coach tests.
 *
 * Covers the full security surface (401 / 400 / 404 / 403), the graceful
 * rule-based fallback (AI disabled), a SUCCESSFUL AI call (provider mocked
 * via jest.spyOn(global, 'fetch')) and graceful fallback when the provider
 * fails (HTTP 500 or network error). No real AI provider is ever contacted.
 */
const request = require('supertest');
const app = require('../src/app');
const { seedJobs } = require('../src/seed/seedJobs');

// The AI env vars are flipped per test - save/restore them around the suite.
const AI_ENV_KEYS = ['AI_ENABLED', 'AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL'];
let savedAiEnv;

beforeAll(() => {
  savedAiEnv = {};
  for (const key of AI_ENV_KEYS) savedAiEnv[key] = process.env[key];
  // Configured but DISABLED by default - each test decides its own mode.
  process.env.AI_API_KEY = 'test-ai-key';
  process.env.AI_BASE_URL = 'http://mock-ai.local/v1';
  process.env.AI_MODEL = 'test-model';
});

afterAll(() => {
  for (const key of AI_ENV_KEYS) {
    if (savedAiEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedAiEnv[key];
  }
});

afterEach(() => {
  jest.restoreAllMocks(); // undo any global.fetch spy from the test
  process.env.AI_ENABLED = 'false'; // deterministic starting point
});

const registerAndGetToken = async (email) => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'AI Tester', email, password: 'Password123' });
  return res.body.data.token;
};

const createAnalysisFor = async (email) => {
  const token = await registerAndGetToken(email);
  await request(app)
    .put('/api/users/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({
      currentSkills: [
        { skillName: 'JavaScript', proficiencyLevel: 'advanced' },
        { skillName: 'Node.js', proficiencyLevel: 'beginner' },
        { skillName: 'MongoDB', proficiencyLevel: 'intermediate' },
        { skillName: 'Git', proficiencyLevel: 'intermediate' },
        { skillName: 'SQL', proficiencyLevel: 'beginner' },
      ],
    });
  await seedJobs();
  const list = await request(app).get('/api/jobs');
  const backendJob = list.body.data.jobs.find((j) => j.title === 'Junior Backend Developer');
  const created = await request(app)
    .post(`/api/analysis/${backendJob._id}`)
    .set('Authorization', `Bearer ${token}`);

  expect(created.status).toBe(201);
  return { token, analysisId: created.body.data.analysisId };
};

describe('AI Career Coach API', () => {
  test('POST /api/ai/explain/:analysisId - 401 without a token', async () => {
    const res = await request(app).post('/api/ai/explain/000000000000000000000000');
    expect(res.status).toBe(401);
  });

  test('POST /api/ai/roadmap/:analysisId - 401 without a token', async () => {
    const res = await request(app).post('/api/ai/roadmap/000000000000000000000000');
    expect(res.status).toBe(401);
  });

  test('malformed analysisId returns 400', async () => {
    const { token } = await createAnalysisFor('ai-ids@example.com');
    const res = await request(app)
      .post('/api/ai/explain/not-a-valid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors[0].field).toBe('params.analysisId');
  });

  test('well-formed but unknown analysisId returns 404', async () => {
    const { token } = await createAnalysisFor('ai-404@example.com');
    const res = await request(app)
      .post('/api/ai/explain/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('user B cannot generate explanations for user A analysis (403)', async () => {
    const { analysisId } = await createAnalysisFor('ai-owner@example.com');
    const intruder = await registerAndGetToken('ai-intruder@example.com');

    const res = await request(app)
      .post(`/api/ai/explain/${analysisId}`)
      .set('Authorization', `Bearer ${intruder}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('AI disabled -> rule-based explanation with source "rule-based"', async () => {
    process.env.AI_ENABLED = 'false';
    const { token, analysisId } = await createAnalysisFor('ai-rulebased@example.com');

    const res = await request(app)
      .post(`/api/ai/explain/${analysisId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.source).toBe('rule-based');
    expect(res.body.data.jobTitle).toBe('Junior Backend Developer');
    expect(res.body.data.overallMatchPercentage).toBe(65.52); // from the saved analysis
    expect(res.body.data.explanation).toContain('overall match of 65.52%');
    expect(res.body.data.explanation).toContain('REST APIs'); // a missing skill appears
  });

  test('AI disabled -> rule-based roadmap lists the recommended skills week by week', async () => {
    process.env.AI_ENABLED = 'false';
    const { token, analysisId } = await createAnalysisFor('ai-roadmap@example.com');

    const res = await request(app)
      .post(`/api/ai/roadmap/${analysisId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('rule-based');
    expect(res.body.data.roadmap).toMatch(/Week 1:/);
    expect(res.body.data.roadmap).toContain('REST APIs'); // highest-priority recommendation first
  });

  test('AI enabled + provider answers -> text returned with source "ai"', async () => {
    process.env.AI_ENABLED = 'true';
    const { token, analysisId } = await createAnalysisFor('ai-success@example.com');

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '  AI GENERATED EXPLANATION  ' } }] }),
    });

    const res = await request(app)
      .post(`/api/ai/explain/${analysisId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('ai');
    expect(res.body.data.explanation).toBe('AI GENERATED EXPLANATION'); // trimmed

    // The request went to the configured provider with the configured model.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('http://mock-ai.local/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer test-ai-key');
    expect(JSON.parse(options.body).model).toBe('test-model');
  });

  test('AI enabled but provider returns 500 -> graceful rule-based fallback', async () => {
    process.env.AI_ENABLED = 'true';
    const { token, analysisId } = await createAnalysisFor('ai-500@example.com');

    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    const res = await request(app)
      .post(`/api/ai/explain/${analysisId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('rule-based');
    expect(res.body.data.explanation).toContain('overall match of 65.52%');
  });

  test('AI enabled but network error -> graceful rule-based fallback', async () => {
    process.env.AI_ENABLED = 'true';
    const { token, analysisId } = await createAnalysisFor('ai-network@example.com');

    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    const res = await request(app)
      .post(`/api/ai/roadmap/${analysisId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('rule-based');
    expect(res.body.data.roadmap).toMatch(/Week 1:/);
  });
});

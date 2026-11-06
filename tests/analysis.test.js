/**
 * Skill-gap analysis tests: the pure scoring engine AND the full API flow
 * (including the exact weighted example from the project specification).
 */
const request = require('supertest');
const app = require('../src/app');
const { analyzeSkillGap } = require('../src/services/analysis.service');
const { seedJobs } = require('../src/seed/seedJobs');

// ---- The exact example from the project spec -------------------------
// Required: JavaScript-Intermediate-High, Node.js-Advanced-High,
//           MongoDB-Intermediate-Medium, Docker-Beginner-Low
// User:     JavaScript-Advanced, Node.js-Intermediate, MongoDB-Intermediate
//
// max  = 3x2 + 3x3 + 2x2 + 1x1        = 6 + 9 + 4 + 1 = 20
// earned = 3x2 + 3x2 + 2x2 + 0        = 6 + 6 + 4 + 0 = 16
// percentage = 16/20 x 100 = 80.00
const SPEC_JOB_SKILLS = [
  { skillName: 'JavaScript', requiredLevel: 'intermediate', importance: 'high' },
  { skillName: 'Node.js', requiredLevel: 'advanced', importance: 'high' },
  { skillName: 'MongoDB', requiredLevel: 'intermediate', importance: 'medium' },
  { skillName: 'Docker', requiredLevel: 'beginner', importance: 'low' },
];
const SPEC_USER_SKILLS = [
  { skillName: 'JavaScript', proficiencyLevel: 'advanced' },
  { skillName: 'Node.js', proficiencyLevel: 'intermediate' },
  { skillName: 'MongoDB', proficiencyLevel: 'intermediate' },
];

describe('Skill-gap calculation (pure logic)', () => {
  test('categorizes skills exactly like the spec example', () => {
    const result = analyzeSkillGap(SPEC_USER_SKILLS, SPEC_JOB_SKILLS);

    expect(result.matchedSkills.map((s) => s.skillName).sort()).toEqual(['JavaScript', 'MongoDB']);
    expect(result.improvementSkills.map((s) => s.skillName)).toEqual(['Node.js']);
    expect(result.missingSkills.map((s) => s.skillName)).toEqual(['Docker']);
  });

  test('weighted match percentage for the spec example is exactly 80', () => {
    const result = analyzeSkillGap(SPEC_USER_SKILLS, SPEC_JOB_SKILLS);
    expect(result.overallMatchPercentage).toBe(80);
  });

  test('percentage never exceeds 100, even for an over-qualified user', () => {
    const overQualified = [
      { skillName: 'JavaScript', proficiencyLevel: 'advanced' },
      { skillName: 'Node.js', proficiencyLevel: 'advanced' },
      { skillName: 'MongoDB', proficiencyLevel: 'advanced' },
      { skillName: 'Docker', proficiencyLevel: 'advanced' },
    ];
    const result = analyzeSkillGap(overQualified, SPEC_JOB_SKILLS);

    expect(result.overallMatchPercentage).toBe(100);
    expect(result.improvementSkills).toHaveLength(0);
    expect(result.missingSkills).toHaveLength(0);
  });

  test('user with none of the required skills scores 0', () => {
    const unrelated = [{ skillName: 'Painting', proficiencyLevel: 'advanced' }];
    const result = analyzeSkillGap(unrelated, SPEC_JOB_SKILLS);

    expect(result.overallMatchPercentage).toBe(0);
    expect(result.matchedSkills).toHaveLength(0);
    expect(result.missingSkills).toHaveLength(4);
  });

  test('job with no required skills returns 0 percent and empty lists (no division by zero)', () => {
    const result = analyzeSkillGap(SPEC_USER_SKILLS, []);

    expect(result.overallMatchPercentage).toBe(0);
    expect(result.matchedSkills).toHaveLength(0);
    expect(result.missingSkills).toHaveLength(0);
    expect(result.improvementSkills).toHaveLength(0);
  });

  test('skill names match case-insensitively and ignore extra whitespace', () => {
    // Trimming + case-insensitive comparison; internal spacing is preserved.
    const messy = [{ skillName: '   jAvAsCrIpT  ', proficiencyLevel: 'advanced' }];
    const result = analyzeSkillGap(messy, [
      { skillName: 'JavaScript', requiredLevel: 'intermediate', importance: 'high' },
    ]);

    expect(result.matchedSkills).toHaveLength(1);
    expect(result.missingSkills).toHaveLength(0);
  });
});

describe('Skill-gap analysis API', () => {
  const registerAndGetToken = async (email) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Demo User', email, password: 'Password123' });
    return res.body.data.token;
  };

  const updateSkills = async (token, currentSkills) =>
    request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentSkills });

  test('full workflow: profile -> seed -> analyze -> correct weighted result', async () => {
    const token = await registerAndGetToken('worker@example.com');

    // Demo profile (documented in the README - see worked example).
    await updateSkills(token, [
      { skillName: 'JavaScript', proficiencyLevel: 'advanced' },
      { skillName: 'Node.js', proficiencyLevel: 'beginner' },
      { skillName: 'MongoDB', proficiencyLevel: 'intermediate' },
      { skillName: 'Git', proficiencyLevel: 'intermediate' },
      { skillName: 'SQL', proficiencyLevel: 'beginner' },
    ]);

    await seedJobs();
    const jobsRes = await request(app).get('/api/jobs?category=Backend%20Development');
    const backendJob = jobsRes.body.data.jobs.find((j) => j.title === 'Junior Backend Developer');
    expect(backendJob).toBeDefined();

    const res = await request(app)
      .post(`/api/analysis/${backendJob._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Skill analysis completed successfully');

    // earned 19 of max 29 -> 65.52% (see README worked example)
    expect(res.body.data.overallMatchPercentage).toBe(65.52);
    expect(res.body.data.matchedSkills.map((s) => s.skillName)).toEqual(
      expect.arrayContaining(['JavaScript', 'MongoDB', 'Git', 'SQL'])
    );
    expect(res.body.data.improvementSkills.map((s) => s.skillName)).toEqual(['Node.js']);
    expect(res.body.data.missingSkills.map((s) => s.skillName)).toEqual(
      expect.arrayContaining(['REST APIs', 'Docker'])
    );

    // Recommendations exist, have the documented shape, and are sorted high -> low.
    const recs = res.body.data.recommendations;
    expect(recs.length).toBe(3);
    for (const rec of recs) {
      expect(rec).toHaveProperty('skillName');
      expect(rec).toHaveProperty('currentLevel');
      expect(rec).toHaveProperty('targetLevel');
      expect(rec).toHaveProperty('priority');
      expect(rec).toHaveProperty('reason');
      expect(rec).toHaveProperty('suggestedAction');
    }
    const rank = { high: 0, medium: 1, low: 2 };
    const priorities = recs.map((r) => rank[r.priority]);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
  });

  test('POST /api/analysis/:jobId - 401 without a token', async () => {
    const res = await request(app).post('/api/analysis/000000000000000000000000');
    expect(res.status).toBe(401);
  });

  test('POST /api/analysis/:jobId - malformed job id returns 400', async () => {
    const token = await registerAndGetToken('ids@example.com');
    const res = await request(app)
      .post('/api/analysis/not-a-valid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors[0].field).toBe('params.jobId');
  });

  test('POST /api/analysis/:jobId - well-formed but unknown job returns 404', async () => {
    const token = await registerAndGetToken('missing@example.com');
    const res = await request(app)
      .post('/api/analysis/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('analysis is saved in MongoDB and appears in the user history', async () => {
    const token = await registerAndGetToken('history@example.com');
    await updateSkills(token, SPEC_USER_SKILLS);
    await seedJobs();

    const list = await request(app).get('/api/jobs');
    const jobId = list.body.data.jobs[0]._id;
    const created = await request(app)
      .post(`/api/analysis/${jobId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(created.status).toBe(201);

    const history = await request(app)
      .get('/api/analysis/history')
      .set('Authorization', `Bearer ${token}`);

    expect(history.status).toBe(200);
    expect(history.body.data.count).toBe(1);
    expect(history.body.data.analyses[0].analysisId).toBe(created.body.data.analysisId);
    expect(history.body.data.analyses[0].overallMatchPercentage).toBe(
      created.body.data.overallMatchPercentage
    );
    expect(history.body.data.analyses[0].jobTitle).toBeDefined();
  });

  test('GET /api/analysis/history - 401 without a token', async () => {
    const res = await request(app).get('/api/analysis/history');
    expect(res.status).toBe(401);
  });

  test('authorization: user B cannot access user A analysis or its recommendations', async () => {
    const tokenA = await registerAndGetToken('owner@example.com');
    const tokenB = await registerAndGetToken('intruder@example.com');

    await updateSkills(tokenA, SPEC_USER_SKILLS);
    await seedJobs();
    const list = await request(app).get('/api/jobs');
    const jobId = list.body.data.jobs[0]._id;

    const created = await request(app)
      .post(`/api/analysis/${jobId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    const analysisId = created.body.data.analysisId;

    const stolen = await request(app)
      .get(`/api/analysis/${analysisId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(stolen.status).toBe(403);
    expect(stolen.body.success).toBe(false);

    const stolenRecs = await request(app)
      .get(`/api/recommendations/${analysisId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(stolenRecs.status).toBe(403);

    // The owner CAN read it.
    const owner = await request(app)
      .get(`/api/analysis/${analysisId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(owner.status).toBe(200);

    const unknown = await request(app)
      .get(`/api/analysis/000000000000000000000000`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(unknown.status).toBe(404);
  });

  test('GET /api/recommendations/:analysisId - returns the stored prioritized recommendations', async () => {
    const token = await registerAndGetToken('recs@example.com');
    await updateSkills(token, SPEC_USER_SKILLS);
    await seedJobs();
    const list = await request(app).get('/api/jobs');
    const jobId = list.body.data.jobs[0]._id;

    const created = await request(app)
      .post(`/api/analysis/${jobId}`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get(`/api/recommendations/${created.body.data.analysisId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.analysisId).toBe(created.body.data.analysisId);
    expect(res.body.data.overallMatchPercentage).toBeDefined();
    expect(Array.isArray(res.body.data.recommendations)).toBe(true);
  });
});

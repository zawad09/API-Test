/**
 * Seed script - inserts the five SAMPLE job profiles into MongoDB.
 *
 * Run with:  npm run seed
 *
 * Idempotent: jobs are matched by (title + company); if a record already
 * exists it is updated in place, otherwise it is created. Running the script
 * twice will never create duplicates.
 *
 * NOTE: these are demonstration profiles for the internship prototype,
 * NOT verified or live job vacancies (company names end with "(sample)").
 *
 * If MONGODB_URI is empty, the script connects to a temporary in-memory
 * database and clearly warns that the data will not survive the exit -
 * set MONGODB_URI (MongoDB Atlas) to persist the seed data.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const Job = require('../models/Job');
const { connectDatabase, closeDatabase } = require('../config/database');

const JOB_SEED_DATA = [
  {
    title: 'Junior Machine Learning Engineer',
    company: 'DhakaData Systems (sample)',
    category: 'Machine Learning',
    experienceLevel: 'beginner',
    description:
      'Sample job profile for demonstration. Assist the ML team in building and evaluating models, preparing datasets, and running experiments.',
    requiredSkills: [
      { skillName: 'Python', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'Machine Learning', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'Pandas', requiredLevel: 'intermediate', importance: 'medium' },
      { skillName: 'SQL', requiredLevel: 'beginner', importance: 'medium' },
      { skillName: 'TensorFlow', requiredLevel: 'beginner', importance: 'medium' },
      { skillName: 'Git', requiredLevel: 'beginner', importance: 'low' },
    ],
  },
  {
    title: 'Junior Backend Developer',
    company: 'CloudEdge Solutions (sample)',
    category: 'Backend Development',
    experienceLevel: 'beginner',
    description:
      'Sample job profile for demonstration. Build and maintain REST APIs, work with databases, and support backend services.',
    requiredSkills: [
      { skillName: 'JavaScript', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'Node.js', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'MongoDB', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'REST APIs', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'Git', requiredLevel: 'beginner', importance: 'medium' },
      { skillName: 'SQL', requiredLevel: 'beginner', importance: 'medium' },
      { skillName: 'Docker', requiredLevel: 'beginner', importance: 'low' },
    ],
  },
  {
    title: 'Data Analyst',
    company: 'InsightWorks Analytics (sample)',
    category: 'Data & Analytics',
    experienceLevel: 'beginner',
    description:
      'Sample job profile for demonstration. Analyze business data, build dashboards, and present insights to stakeholders.',
    requiredSkills: [
      { skillName: 'SQL', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'Excel', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'Data Visualization', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'Python', requiredLevel: 'beginner', importance: 'medium' },
      { skillName: 'Statistics', requiredLevel: 'beginner', importance: 'medium' },
      { skillName: 'Power BI', requiredLevel: 'beginner', importance: 'low' },
    ],
  },
  {
    title: 'AI Engineer',
    company: 'NeuralNest Labs (sample)',
    category: 'Artificial Intelligence',
    experienceLevel: 'intermediate',
    description:
      'Sample job profile for demonstration. Design, train, and deploy AI models and work with LLM-based features.',
    requiredSkills: [
      { skillName: 'Python', requiredLevel: 'advanced', importance: 'high' },
      { skillName: 'Machine Learning', requiredLevel: 'advanced', importance: 'high' },
      { skillName: 'Deep Learning', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'PyTorch', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'Docker', requiredLevel: 'intermediate', importance: 'medium' },
      { skillName: 'Git', requiredLevel: 'intermediate', importance: 'medium' },
    ],
  },
  {
    title: 'Junior Software Engineer',
    company: 'CodeCraft Studios (sample)',
    category: 'Software Engineering',
    experienceLevel: 'beginner',
    description:
      'Sample job profile for demonstration. Develop and test web applications, write clean code, and collaborate in an agile team.',
    requiredSkills: [
      { skillName: 'JavaScript', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'Data Structures & Algorithms', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'Object-Oriented Programming', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'Git', requiredLevel: 'intermediate', importance: 'high' },
      { skillName: 'SQL', requiredLevel: 'beginner', importance: 'medium' },
      { skillName: 'Testing', requiredLevel: 'beginner', importance: 'low' },
    ],
  },
];

/**
 * Seed the jobs. Exported so the automated tests can reuse it.
 * @returns {Promise<{created: string[], updated: string[]}>}
 */
const seedJobs = async () => {
  const created = [];
  const updated = [];

  for (const jobData of JOB_SEED_DATA) {
    const existing = await Job.findOne({ title: jobData.title, company: jobData.company });

    if (existing) {
      await Job.updateOne({ _id: existing._id }, { $set: jobData }, { runValidators: true });
      updated.push(jobData.title);
    } else {
      await Job.create(jobData);
      created.push(jobData.title);
    }
  }

  return { created, updated };
};

// Standalone runner: "npm run seed"
if (require.main === module) {
  (async () => {
    console.log('Seeding SkillBridge AI sample jobs...');
    try {
      await connectDatabase();
      const { created, updated } = await seedJobs();

      created.forEach((title) => console.log(`[OK] Created: ${title}`));
      updated.forEach((title) => console.log(`[OK] Updated (already existed): ${title}`));
      console.log(`[OK] Summary: ${created.length} created, ${updated.length} updated, ${JOB_SEED_DATA.length} total.`);

      if (!process.env.MONGODB_URI) {
        console.warn('[WARN] You seeded a TEMPORARY in-memory database - data is discarded when this script exits.');
        console.warn('       Set MONGODB_URI in .env (MongoDB Atlas) to persist the seed data.');
      }

      await closeDatabase();
      process.exit(0);
    } catch (error) {
      console.error(`[ERROR] Seeding failed: ${error.message}`);
      await closeDatabase().catch(() => {});
      process.exit(1);
    }
  })();
}

module.exports = { seedJobs, JOB_SEED_DATA };

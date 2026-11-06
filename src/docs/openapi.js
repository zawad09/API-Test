/**
 * OpenAPI 3.0.3 specification for the SkillBridge AI API.
 *
 * Served as JSON at  GET /openapi.json
 * Rendered by Scalar at /api-reference
 *
 * Every path below maps 1:1 to a route implemented in src/routes/.
 * The examples reflect the REAL response shapes produced by the API.
 */
const spec = {
  openapi: '3.0.3',
  info: {
    title: 'SkillBridge AI API',
    version: '1.0.0',
    description: [
      '**SkillBridge AI - Career Skill Gap Analyzer**',
      '',
      'Compares a user\'s current skills with the requirements of a target job and',
      'returns matched skills, missing skills, skills that need improvement, a',
      'weighted overall match percentage, and prioritized learning recommendations.',
      '',
      'The analysis engine is fully deterministic (weighted scoring), so results are',
      'reliable, repeatable and testable.',
      '',
      'An optional AI Coach layer (POST /api/ai/explain/{analysisId} and',
      'POST /api/ai/roadmap/{analysisId}) turns a saved analysis into natural',
      'language. It works with any OpenAI-compatible provider; without an API key',
      'it answers with the built-in rule-based coach (data.source shows which).',
      '',
      '## How to authenticate',
      '1. `POST /api/auth/register` or `POST /api/auth/login` to receive a JWT.',
      '2. Click the **Authorize** button on this page and paste the token.',
      '3. Protected endpoints will then send it as `Authorization: Bearer <token>`.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'Current server (local development)' }],
  tags: [
    { name: 'Health', description: 'Server and database status' },
    { name: 'Auth', description: 'Registration, login and current user' },
    { name: 'Users', description: 'User profile and skills' },
    { name: 'Jobs', description: 'Sample job roles and their required skills' },
    { name: 'Analysis', description: 'Skill-gap analysis engine' },
    { name: 'Recommendations', description: 'Prioritized learning recommendations' },
    { name: 'AI Coach', description: 'Optional AI layer: natural-language explanation and weekly roadmap of a saved analysis. Falls back to the built-in rule-based coach when no AI key is configured.' },
  ],

  // ------------------------------------------------------------------
  // Reusable components
  // ------------------------------------------------------------------
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the JWT returned by /api/auth/register or /api/auth/login.',
      },
    },

    parameters: {
      IdParam: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Analysis id (24-character hex ObjectId)',
        schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
      },
      JobIdParam: {
        name: 'jobId',
        in: 'path',
        required: true,
        description: 'Job id (24-character hex ObjectId)',
        schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
      },
      AnalysisIdParam: {
        name: 'analysisId',
        in: 'path',
        required: true,
        description: 'Analysis id (24-character hex ObjectId)',
        schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
      },
    },

    schemas: {
      /* ---------- generic ---------- */
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'body.email' },
                message: { type: 'string', example: 'Please provide a valid email address' },
              },
            },
          },
        },
      },

      /* ---------- enums ---------- */
      SkillLevel: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
      Importance: { type: 'string', enum: ['low', 'medium', 'high'] },

      /* ---------- auth / user ---------- */
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 80, example: 'Rahim Uddin' },
          email: { type: 'string', format: 'email', example: 'rahim@example.com' },
          password: {
            type: 'string',
            minLength: 8,
            maxLength: 128,
            description: 'At least 8 characters, with at least one letter and one number.',
            example: 'Password123',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'rahim@example.com' },
          password: { type: 'string', example: 'Password123' },
        },
      },
      CurrentSkill: {
        type: 'object',
        required: ['skillName', 'proficiencyLevel'],
        properties: {
          skillName: { type: 'string', example: 'JavaScript' },
          proficiencyLevel: { $ref: '#/components/schemas/SkillLevel' },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6721f0c9a1b2c3d4e5f60711' },
          name: { type: 'string', example: 'Rahim Uddin' },
          email: { type: 'string', example: 'rahim@example.com' },
          education: { type: 'string', example: 'BSc in Computer Science & Engineering' },
          university: { type: 'string', example: 'University of Dhaka' },
          careerGoal: { type: 'string', example: 'Become a backend developer at a product company' },
          experienceLevel: { $ref: '#/components/schemas/SkillLevel' },
          currentSkills: { type: 'array', items: { $ref: '#/components/schemas/CurrentSkill' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        description: 'Partial update: only the fields you send are changed.',
        properties: {
          education: { type: 'string', maxLength: 120 },
          university: { type: 'string', maxLength: 160 },
          careerGoal: { type: 'string', maxLength: 300 },
          experienceLevel: { $ref: '#/components/schemas/SkillLevel' },
          currentSkills: {
            type: 'array',
            maxItems: 50,
            items: { $ref: '#/components/schemas/CurrentSkill' },
            description: 'Duplicate skill names (ignoring case/spaces) are rejected.',
          },
        },
      },
      AuthData: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/UserProfile' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },

      /* ---------- jobs ---------- */
      RequiredSkill: {
        type: 'object',
        required: ['skillName', 'requiredLevel', 'importance'],
        properties: {
          skillName: { type: 'string', example: 'Node.js' },
          requiredLevel: { $ref: '#/components/schemas/SkillLevel' },
          importance: { $ref: '#/components/schemas/Importance' },
        },
      },
      Job: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6721f0c9a1b2c3d4e5f60722' },
          title: { type: 'string', example: 'Junior Backend Developer' },
          company: { type: 'string', example: 'CloudEdge Solutions (sample)' },
          description: { type: 'string' },
          category: { type: 'string', example: 'Backend Development' },
          experienceLevel: { $ref: '#/components/schemas/SkillLevel' },
          requiredSkills: { type: 'array', items: { $ref: '#/components/schemas/RequiredSkill' } },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      /* ---------- analysis ---------- */
      MatchedSkill: {
        type: 'object',
        properties: {
          skillName: { type: 'string', example: 'JavaScript' },
          requiredLevel: { $ref: '#/components/schemas/SkillLevel' },
          userLevel: { $ref: '#/components/schemas/SkillLevel' },
          importance: { $ref: '#/components/schemas/Importance' },
        },
      },
      MissingSkill: {
        type: 'object',
        properties: {
          skillName: { type: 'string', example: 'REST APIs' },
          requiredLevel: { $ref: '#/components/schemas/SkillLevel' },
          importance: { $ref: '#/components/schemas/Importance' },
        },
      },
      ImprovementSkill: {
        type: 'object',
        properties: {
          skillName: { type: 'string', example: 'Node.js' },
          currentLevel: { $ref: '#/components/schemas/SkillLevel' },
          requiredLevel: { $ref: '#/components/schemas/SkillLevel' },
          importance: { $ref: '#/components/schemas/Importance' },
          levelGap: { type: 'integer', minimum: 1, maximum: 2, example: 1 },
        },
      },
      Recommendation: {
        type: 'object',
        properties: {
          skillName: { type: 'string', example: 'REST APIs' },
          currentLevel: {
            type: 'string',
            nullable: true,
            enum: [null, 'beginner', 'intermediate', 'advanced'],
            description: 'null when the skill is completely missing',
          },
          targetLevel: { $ref: '#/components/schemas/SkillLevel' },
          priority: { $ref: '#/components/schemas/Importance' },
          reason: {
            type: 'string',
            example: 'REST APIs is required at intermediate level for the Junior Backend Developer role, but it is missing from your current skill set.',
          },
          suggestedAction: {
            type: 'string',
            example: 'Build working knowledge of REST APIs: study a structured course or the official documentation, then practice by using REST APIs in a small but realistic project.',
          },
        },
      },
      AnalysisResult: {
        type: 'object',
        properties: {
          analysisId: { type: 'string', example: '6721f0c9a1b2c3d4e5f60733' },
          jobId: { type: 'string', example: '6721f0c9a1b2c3d4e5f60722' },
          jobTitle: { type: 'string', example: 'Junior Backend Developer' },
          company: { type: 'string', example: 'CloudEdge Solutions (sample)' },
          category: { type: 'string', example: 'Backend Development' },
          experienceLevel: { $ref: '#/components/schemas/SkillLevel' },
          overallMatchPercentage: { type: 'number', minimum: 0, maximum: 100, example: 65.52 },
          matchedSkills: { type: 'array', items: { $ref: '#/components/schemas/MatchedSkill' } },
          missingSkills: { type: 'array', items: { $ref: '#/components/schemas/MissingSkill' } },
          improvementSkills: { type: 'array', items: { $ref: '#/components/schemas/ImprovementSkill' } },
          recommendations: { type: 'array', items: { $ref: '#/components/schemas/Recommendation' } },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      RecommendationsData: {
        type: 'object',
        properties: {
          analysisId: { type: 'string' },
          jobId: { type: 'string' },
          jobTitle: { type: 'string' },
          overallMatchPercentage: { type: 'number', example: 65.52 },
          recommendations: { type: 'array', items: { $ref: '#/components/schemas/Recommendation' } },
        },
      },
      HealthData: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          database: { type: 'string', enum: ['connected', 'disconnected'], example: 'connected' },
          environment: { type: 'string', example: 'development' },
          uptimeSeconds: { type: 'integer', example: 42 },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  },

  // ------------------------------------------------------------------
  // Paths (1:1 with src/routes/)
  // ------------------------------------------------------------------
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Check server and database status',
        security: [],
        responses: {
          200: {
            description: 'Server is up; body includes the database connection status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'SkillBridge AI API is healthy' },
                    data: { $ref: '#/components/schemas/HealthData' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Returns the created user (without the password) and a JWT.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
              examples: {
                valid: {
                  value: { name: 'Rahim Uddin', email: 'rahim@example.com', password: 'Password123' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'User registered successfully' },
                    data: { $ref: '#/components/schemas/AuthData' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation failed (missing/invalid fields, weak password)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          409: {
            description: 'Email already registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { success: false, message: 'An account with this email already exists. Please log in instead.', errors: [] },
              },
            },
          },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              example: { email: 'rahim@example.com', password: 'Password123' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    data: { $ref: '#/components/schemas/AuthData' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation failed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          401: {
            description: 'Invalid email or password',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { success: false, message: 'Invalid email or password', errors: [] },
              },
            },
          },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user (from the JWT)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Authenticated user retrieved successfully' },
                    data: { type: 'object', properties: { user: { $ref: '#/components/schemas/UserProfile' } } },
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing, invalid or expired token',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    '/api/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Get the authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Profile of the token owner (a user can never read another user profile)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Profile retrieved successfully' },
                    data: { type: 'object', properties: { user: { $ref: '#/components/schemas/UserProfile' } } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update profile and skills',
        description: 'Partial update. Sending `currentSkills: []` clears the list; omitting it keeps it unchanged.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProfileRequest' },
              example: {
                education: 'BSc in Computer Science & Engineering',
                university: 'University of Dhaka',
                careerGoal: 'Become a backend developer at a product company',
                experienceLevel: 'beginner',
                currentSkills: [
                  { skillName: 'JavaScript', proficiencyLevel: 'advanced' },
                  { skillName: 'Node.js', proficiencyLevel: 'beginner' },
                  { skillName: 'MongoDB', proficiencyLevel: 'intermediate' },
                  { skillName: 'Git', proficiencyLevel: 'intermediate' },
                  { skillName: 'SQL', proficiencyLevel: 'beginner' },
                ],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Profile updated successfully' },
                    data: { type: 'object', properties: { user: { $ref: '#/components/schemas/UserProfile' } } },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation failed (e.g. duplicate skill names in the request)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/jobs': {
      get: {
        tags: ['Jobs'],
        summary: 'Get all active jobs',
        security: [],
        parameters: [
          {
            name: 'category',
            in: 'query',
            required: false,
            description: 'Exact, case-insensitive category filter',
            schema: { type: 'string', example: 'Backend Development' },
          },
          {
            name: 'experienceLevel',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/SkillLevel' },
          },
        ],
        responses: {
          200: {
            description: 'List of active jobs (sample demonstration profiles)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Active jobs retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        count: { type: 'integer', example: 5 },
                        jobs: { type: 'array', items: { $ref: '#/components/schemas/Job' } },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid filter value', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/jobs/{id}': {
      get: {
        tags: ['Jobs'],
        summary: 'Get a specific job',
        security: [],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } }],
        responses: {
          200: {
            description: 'Job details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Job retrieved successfully' },
                    data: { type: 'object', properties: { job: { $ref: '#/components/schemas/Job' } } },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid id format', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: {
            description: 'Job not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { success: false, message: 'Job not found', errors: [] },
              },
            },
          },
        },
      },
    },

    '/api/analysis/{jobId}': {
      post: {
        tags: ['Analysis'],
        summary: 'Analyze the authenticated user skills against a job',
        description: [
          'Runs the deterministic weighted scoring engine:',
          '',
          '- maxScore per skill = importance weight (low 1 / medium 2 / high 3) x required level (beginner 1 / intermediate 2 / advanced 3)',
          '- earnedScore = weight x min(user level, required level); 0 when the skill is missing',
          '- overallMatchPercentage = round(total earned / total max x 100, 2), capped at 100',
          '',
          'The result is saved to MongoDB and returned.',
        ].join('\n'),
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/JobIdParam' }],
        responses: {
          201: {
            description: 'Analysis completed and saved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Skill analysis completed successfully' },
                    data: { $ref: '#/components/schemas/AnalysisResult' },
                  },
                  example: {
                    success: true,
                    message: 'Skill analysis completed successfully',
                    data: {
                      analysisId: '6721f0c9a1b2c3d4e5f60733',
                      jobId: '6721f0c9a1b2c3d4e5f60722',
                      jobTitle: 'Junior Backend Developer',
                      company: 'CloudEdge Solutions (sample)',
                      overallMatchPercentage: 65.52,
                      matchedSkills: [
                        { skillName: 'JavaScript', requiredLevel: 'intermediate', userLevel: 'advanced', importance: 'high' },
                        { skillName: 'MongoDB', requiredLevel: 'intermediate', userLevel: 'intermediate', importance: 'high' },
                        { skillName: 'Git', requiredLevel: 'beginner', userLevel: 'intermediate', importance: 'medium' },
                        { skillName: 'SQL', requiredLevel: 'beginner', userLevel: 'beginner', importance: 'medium' },
                      ],
                      improvementSkills: [
                        { skillName: 'Node.js', currentLevel: 'beginner', requiredLevel: 'intermediate', importance: 'high', levelGap: 1 },
                      ],
                      missingSkills: [
                        { skillName: 'REST APIs', requiredLevel: 'intermediate', importance: 'high' },
                        { skillName: 'Docker', requiredLevel: 'beginner', importance: 'low' },
                      ],
                      recommendations: [
                        {
                          skillName: 'REST APIs',
                          currentLevel: null,
                          targetLevel: 'intermediate',
                          priority: 'high',
                          reason: 'REST APIs is required at intermediate level for the Junior Backend Developer role, but it is missing from your current skill set.',
                          suggestedAction: 'Build working knowledge of REST APIs: study a structured course or the official documentation, then practice by using REST APIs in a small but realistic project.',
                        },
                        {
                          skillName: 'Node.js',
                          currentLevel: 'beginner',
                          targetLevel: 'intermediate',
                          priority: 'high',
                          reason: 'You know Node.js at beginner level, but the Junior Backend Developer role requires intermediate level proficiency.',
                          suggestedAction: 'Strengthen your Node.js fundamentals with targeted exercises, then take on a slightly bigger project to move up one proficiency level.',
                        },
                        {
                          skillName: 'Docker',
                          currentLevel: null,
                          targetLevel: 'beginner',
                          priority: 'low',
                          reason: 'Docker is required at beginner level for the Junior Backend Developer role, but it is missing from your current skill set.',
                          suggestedAction: 'Start with the fundamentals of Docker: follow a beginner-friendly tutorial or an official getting-started guide, then apply the basics in one small hands-on project.',
                        },
                      ],
                      createdAt: '2026-01-15T10:30:00.000Z',
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid jobId format', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: {
            description: 'Job (or user) not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { success: false, message: 'Job not found. Pick a job from GET /api/jobs first.', errors: [] },
              },
            },
          },
        },
      },
    },

    '/api/analysis/history': {
      get: {
        tags: ['Analysis'],
        summary: "Get the authenticated user's analysis history",
        description: 'Newest first. Only the token owner history is ever returned.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'History list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Analysis history retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        count: { type: 'integer', example: 1 },
                        analyses: { type: 'array', items: { $ref: '#/components/schemas/AnalysisResult' } },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/analysis/{id}': {
      get: {
        tags: ['Analysis'],
        summary: 'Get a specific analysis (owner only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: {
            description: 'The analysis document',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Analysis retrieved successfully' },
                    data: { $ref: '#/components/schemas/AnalysisResult' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid id format', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: {
            description: 'The analysis belongs to another user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { success: false, message: 'You do not have permission to access this analysis.', errors: [] },
              },
            },
          },
          404: { description: 'Analysis not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/recommendations/{analysisId}': {
      get: {
        tags: ['Recommendations'],
        summary: 'Get recommendations for an analysis (owner only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/AnalysisIdParam' }],
        responses: {
          200: {
            description: 'Prioritized recommendations (high -> medium -> low; missing before improvement on ties)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Recommendations retrieved successfully' },
                    data: { $ref: '#/components/schemas/RecommendationsData' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid analysisId format', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'The analysis belongs to another user', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Analysis not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/ai/explain/{analysisId}': {
      post: {
        tags: ['AI Coach'],
        summary: 'Explain an analysis in natural language (owner only)',
        description: [
          'Turns a SAVED analysis into a friendly explanation.',
          '',
          '- If an AI provider is configured (AI_ENABLED=true plus AI_API_KEY / AI_BASE_URL / AI_MODEL), the text is generated by the LLM -> data.source: "ai".',
          '- Otherwise - or if the provider fails or times out - the built-in deterministic rule-based coach answers -> data.source: "rule-based".',
          '',
          'The AI never recalculates scores: it only rephrases the already-saved result.',
        ].join('\n'),
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/AnalysisIdParam' }],
        responses: {
          200: {
            description: 'Explanation generated (check data.source for "ai" vs "rule-based")',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        analysisId: { type: 'string', example: '6721f0c9a1b2c3d4e5f60733' },
                        jobTitle: { type: 'string', example: 'Junior Backend Developer' },
                        overallMatchPercentage: { type: 'number', example: 65.52 },
                        source: { type: 'string', enum: ['ai', 'rule-based'], example: 'rule-based' },
                        explanation: {
                          type: 'string',
                          example: 'Your analysis for the Junior Backend Developer role shows an overall match of 65.52%.\n\nWhat you already have: JavaScript (advanced), MongoDB (intermediate), Git (intermediate), SQL (beginner)...',
                        },
                        generatedAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid analysisId format', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'The analysis belongs to another user', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Analysis not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/ai/roadmap/{analysisId}': {
      post: {
        tags: ['AI Coach'],
        summary: 'Generate a week-by-week learning roadmap for an analysis (owner only)',
        description: [
          'Turns the saved prioritized recommendations into a practical learning plan (maximum 8 weeks).',
          '',
          'Same source rules as /api/ai/explain: LLM text when a provider is configured, rule-based coach otherwise.',
        ].join('\n'),
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/AnalysisIdParam' }],
        responses: {
          200: {
            description: 'Roadmap generated (check data.source for "ai" vs "rule-based")',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        analysisId: { type: 'string', example: '6721f0c9a1b2c3d4e5f60733' },
                        jobTitle: { type: 'string', example: 'Junior Backend Developer' },
                        overallMatchPercentage: { type: 'number', example: 65.52 },
                        source: { type: 'string', enum: ['ai', 'rule-based'], example: 'rule-based' },
                        roadmap: {
                          type: 'string',
                          example: 'Week 1: REST APIs - goal: reach intermediate level.\nFocus: Build working knowledge of REST APIs: study a structured course or the official documentation, then practice by using REST APIs in a small but realistic project.',
                        },
                        generatedAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid analysisId format', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'The analysis belongs to another user', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Analysis not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  },
};

module.exports = spec;

/**
 * AI Career Coach service - the ADDITIVE AI layer on top of the
 * deterministic skill-gap engine.
 *
 * ------------------------------------------------------------------
 * Design rules (important - these came from the project review)
 * ------------------------------------------------------------------
 * 1. The AI NEVER computes scores. It only receives the ALREADY SAVED
 *    analysis (produced by the deterministic weighted engine) and turns
 *    it into human-friendly text. A hallucinating model can therefore
 *    never corrupt the match percentage or the skill categories.
 *
 * 2. Provider-agnostic: any OpenAI-compatible API works by setting three
 *    environment variables (AI_API_KEY, AI_BASE_URL, AI_MODEL). Free
 *    tiers exist, so nothing paid is required:
 *      - Google AI Studio: AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
 *        with a Flash model (free tier, no credit card needed).
 *      - Groq:             AI_BASE_URL=https://api.groq.com/openai/v1
 *        with llama-3.1-8b-instant or llama-3.3-70b-versatile.
 *
 * 3. Graceful degradation: if AI is disabled, not configured, slow, or
 *    failing, every AI endpoint still answers - using the built-in
 *    rule-based coach - and reports source: "rule-based" instead of
 *    "ai". A dead AI provider can never break the demo.
 *
 * The raw HTTP call uses the native fetch (Node >= 18), so no extra
 * SDK dependency is needed.
 */

/** How long to wait for the AI provider before giving up (ms). */
const AI_TIMEOUT_MS = 30000;

/** Token budget for generated text (keeps answers short and cheap). */
const MAX_OUTPUT_TOKENS = 800;

/**
 * AI is only used when ALL FOUR conditions are true:
 * explicitly enabled AND key + base URL + model are configured.
 * Checked on every request, so tests (and users) can flip it at runtime.
 */
const isAIEnabled = () =>
  process.env.AI_ENABLED === 'true' &&
  Boolean(process.env.AI_API_KEY) &&
  Boolean(process.env.AI_BASE_URL) &&
  Boolean(process.env.AI_MODEL);

/**
 * One chat completion against any OpenAI-compatible provider.
 * Returns the generated text, or null on ANY failure (disabled, network
 * error, timeout, non-2xx, malformed body) - it never throws, so callers
 * can fall back to the rule-based text safely.
 */
const chatCompletion = async ({ systemPrompt, userPrompt }) => {
  if (!isAIEnabled()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const baseUrl = String(process.env.AI_BASE_URL).replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: MAX_OUTPUT_TOKENS,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null; // provider error -> caller falls back

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.trim() ? content.trim() : null;
  } catch {
    return null; // network error / timeout / malformed JSON -> fallback
  } finally {
    clearTimeout(timer);
  }
};

/* ------------------------------------------------------------------
 * Prompt building
 * ------------------------------------------------------------------ */

const COACH_SYSTEM_PROMPT =
  'You are SkillBridge AI, a concise and encouraging career coach for university ' +
  'graduates in Bangladesh looking for their first tech job. Use simple English, ' +
  'be practical and specific. CRITICAL: use ONLY the numbers, skill names and ' +
  'levels provided in the analysis data - never invent or recalculate a match ' +
  'percentage, and never mention skills that are not in the data.';

/** Compact JSON summary of the SAVED analysis (the AI's only source of truth). */
const buildAnalysisContext = (analysis, job) =>
  JSON.stringify(
    {
      jobTitle: job?.title,
      company: job?.company,
      overallMatchPercentage: analysis.overallMatchPercentage,
      matchedSkills: (analysis.matchedSkills ?? []).map(
        (s) => `${s.skillName} (your level: ${s.userLevel}, required: ${s.requiredLevel}, ${s.importance} importance)`
      ),
      improvementSkills: (analysis.improvementSkills ?? []).map(
        (s) => `${s.skillName} (your level: ${s.currentLevel}, required: ${s.requiredLevel}, ${s.importance} importance)`
      ),
      missingSkills: (analysis.missingSkills ?? []).map(
        (s) => `${s.skillName} (required: ${s.requiredLevel}, ${s.importance} importance)`
      ),
      recommendations: (analysis.recommendations ?? []).map((r) => ({
        skill: r.skillName,
        priority: r.priority,
        targetLevel: r.targetLevel,
        suggestedAction: r.suggestedAction,
      })),
    },
    null,
    2
  );

const buildExplainPrompts = (analysis, job) => ({
  systemPrompt:
    COACH_SYSTEM_PROMPT +
    ' Explain the skill-gap analysis below in 150-250 words. Structure: one short ' +
    'opening sentence, then the sections "What you already have", "Where you are ' +
    'close", "What is missing" and "Your next steps".',
  userPrompt: `Analysis data:\n${buildAnalysisContext(analysis, job)}\n\nWrite the explanation now.`,
});

const buildRoadmapPrompts = (analysis, job) => ({
  systemPrompt:
    COACH_SYSTEM_PROMPT +
    ' Turn the prioritized recommendations below into a practical week-by-week ' +
    'learning roadmap (maximum 8 weeks). For every week output exactly one line in ' +
    'this format: "Week N: <skill> - <one concrete goal> - <one practical exercise ' +
    'or small project idea>". Cover every recommended skill in the given order and ' +
    'finish with one portfolio tip.',
  userPrompt: `Analysis data:\n${buildAnalysisContext(analysis, job)}\n\nWrite the roadmap now.`,
});

/* ------------------------------------------------------------------
 * Rule-based fallbacks (used whenever the AI is unavailable)
 * ------------------------------------------------------------------ */

/** Deterministic explanation built directly from the saved analysis. */
const buildRuleBasedExplanation = (analysis, job) => {
  const matched = analysis.matchedSkills ?? [];
  const improvement = analysis.improvementSkills ?? [];
  const missing = analysis.missingSkills ?? [];
  const lines = [];

  lines.push(
    `Your analysis for the ${job?.title ?? 'target'} role shows an overall match of ${analysis.overallMatchPercentage}%.`
  );

  if (matched.length > 0) {
    lines.push(
      `What you already have: ${matched.map((s) => `${s.skillName} (${s.userLevel})`).join(', ')}. ` +
        'These skills meet or exceed the job requirements - keep them sharp.'
    );
  }
  if (improvement.length > 0) {
    lines.push(
      `Where you are close: ${improvement
        .map((s) => `${s.skillName} (current: ${s.currentLevel}, required: ${s.requiredLevel})`)
        .join(', ')}. Focused practice closes these gaps fastest.`
    );
  }
  if (missing.length > 0) {
    lines.push(
      `What is missing: ${missing.map((s) => `${s.skillName} (required: ${s.requiredLevel})`).join(', ')}.`
    );
  }

  const top = (analysis.recommendations ?? []).slice(0, 3);
  if (top.length > 0) {
    lines.push('Your next steps, in priority order:');
    top.forEach((r, i) => lines.push(`${i + 1}. ${r.skillName} (${r.priority} priority): ${r.suggestedAction}`));
  } else {
    lines.push(
      'You match every required skill for this role - start applying, and strengthen your profile with one portfolio project that combines these skills.'
    );
  }

  return lines.join('\n\n');
};

/** Deterministic week-by-week plan built from the saved recommendations. */
const buildRuleBasedRoadmap = (analysis, job) => {
  const recs = analysis.recommendations ?? [];

  if (recs.length === 0) {
    return (
      `Week 1-2: You already match every required skill for ${job?.title ?? 'this role'}.\n` +
      'Goal: turn knowledge into evidence - build one portfolio project that combines your strongest skills, ' +
      'and prepare a short walkthrough of it for interviews.'
    );
  }

  const weeks = recs.slice(0, 8).map((r, i) => {
    const goal = r.currentLevel
      ? `move from ${r.currentLevel} to ${r.targetLevel} level`
      : `reach ${r.targetLevel} level`;
    return `Week ${i + 1}: ${r.skillName} - goal: ${goal}.\nFocus: ${r.suggestedAction}`;
  });

  const closing =
    'Final week: Portfolio - combine everything you practiced into one small end-to-end project and write a short README for it.';

  return `${weeks.join('\n\n')}\n\n${closing}`;
};

/* ------------------------------------------------------------------
 * Public API: try the AI first, fall back to the rule-based coach
 * ------------------------------------------------------------------ */

const generateExplanation = async (analysis, job) => {
  if (isAIEnabled()) {
    const text = await chatCompletion(buildExplainPrompts(analysis, job));
    if (text) return { source: 'ai', explanation: text };
  }
  return { source: 'rule-based', explanation: buildRuleBasedExplanation(analysis, job) };
};

const generateRoadmap = async (analysis, job) => {
  if (isAIEnabled()) {
    const text = await chatCompletion(buildRoadmapPrompts(analysis, job));
    if (text) return { source: 'ai', roadmap: text };
  }
  return { source: 'rule-based', roadmap: buildRuleBasedRoadmap(analysis, job) };
};

module.exports = {
  isAIEnabled,
  chatCompletion,
  buildAnalysisContext,
  buildExplainPrompts,
  buildRoadmapPrompts,
  buildRuleBasedExplanation,
  buildRuleBasedRoadmap,
  generateExplanation,
  generateRoadmap,
};

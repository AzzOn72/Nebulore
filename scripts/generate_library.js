/**
 * Nebulore — "Holy Grail" Uncapped Library Generator (Phase 10)
 *
 * Standalone Node.js script (NOT React Native) that autonomously generates
 * highly premium, long-form facts/theories with the Google Gemini API (AI
 * Studio) and batch-inserts them into the Supabase `facts` table — without
 * ever repeating a topic.
 *
 * Google Gemini free tier: 1,500 requests/day, 1M tokens/minute, 15 RPM.
 * At 10 articles/request with ~4.5s pacing we reach ~13 RPM → up to ~15,000
 * articles per day for free.
 *
 * Architecture:
 *   1. Combinatorial Matrix — 5 categories x 10 extreme "Lenses". Each request
 *      randomly combines 1 Category + 1 Lens + a fresh crypto entropy seed so
 *      the LLM is forced into unexplored territory every single time.
 *   2. Short-Term Memory — the titles of the last 100 generated articles are
 *      fed back into the system prompt as a hard BANNED TOPICS blacklist.
 *   3. Auto-Healing — an infinite while(true) loop wraps the Gemini call and
 *      the Supabase batch insert in try/catch. 429 rate limits → sleep 60s →
 *      auto-resume. Bad-JSON / other errors → sleep 5s → continue. Never
 *      crashes; safe to leave unattended for days.
 *   4. Structured Output — responseMimeType "application/json" with a
 *      responseSchema guarantees valid JSON from Gemini, eliminating the
 *      markdown / malformed-JSON issues that plagued the Groq pipeline.
 *
 * Usage:
 *   node scripts/generate_library.js            # runs forever (Ctrl+C to stop)
 *
 * Required environment variables (loaded from .env):
 *   SUPABASE_URL                 (or EXPO_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY    (preferred for inserts; or SUPABASE_KEY /
 *                                 EXPO_PUBLIC_SUPABASE_ANON_KEY as a fallback)
 *   GEMINI_API_KEY               (Google AI Studio key)
 *
 * Optional overrides:
 *   GEMINI_MODEL         (default: gemini-2.5-flash)
 *   ARTICLES_PER_ROUND   (default: 10)
 *   GENERATE_DELAY_MS    (default: 4500 — ~13 RPM, safely under Gemini's 15 RPM)
 *   RATE_LIMIT_SLEEP_MS  (default: 60000 — cool-down after a 429)
 *   MAX_OUTPUT_TOKENS     (default: 24000)
 */

require('dotenv').config();

const crypto = require('crypto');

// supabase-js initializes a realtime client (which needs a WebSocket) at
// createClient time. Node < 22 has no global WebSocket, so polyfill it with
// `ws`. This script only uses the REST API, so the socket is never opened.
if (typeof globalThis.WebSocket === 'undefined') {
  try {
    globalThis.WebSocket = require('ws');
  } catch (_) {
    // `ws` not installed — fine on Node >= 22 which has a native WebSocket.
  }
}

const { createClient } = require('@supabase/supabase-js');
const {
  GoogleGenerativeAI,
  SchemaType,
} = require('@google/generative-ai');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ARTICLES_PER_ROUND =
  Number.parseInt(process.env.ARTICLES_PER_ROUND, 10) || 10;
const MAX_OUTPUT_TOKENS =
  Number.parseInt(process.env.MAX_OUTPUT_TOKENS, 10) || 24000;
// Gemini free tier allows 15 RPM. 4.5s pacing → ~13 RPM, safely under limit.
const DELAY_MS =
  Number.parseInt(process.env.GENERATE_DELAY_MS, 10) || 4500;
// Cool-down applied when a 429 rate-limit error is caught.
const RATE_LIMIT_SLEEP_MS =
  Number.parseInt(process.env.RATE_LIMIT_SLEEP_MS, 10) || 60000;
// How many recent titles to remember and ban from future generations.
const MEMORY_SIZE = 100;

/**
 * The Combinatorial Matrix: 5 categories, each with 10 extreme "Lenses" /
 * perspectives. Randomly combining a category with a lens (plus a per-request
 * crypto entropy seed) yields an enormous, effectively non-repeating space of
 * premium topics. `key` must match the category keys used by the app
 * (src/config) so the mobile UI can filter and theme each fact correctly.
 */
const MATRIX = {
  cosmos: {
    label: 'Cosmos & Quantum Physics',
    field:
      'astrophysics, quantum mechanics, cosmology, spacetime, or particle physics',
    lenses: [
      'through the lens of a single unexplained cosmic anomaly',
      'focusing on a microscopic sub-atomic paradox that breaks intuition',
      'projecting billions of years into the deep future of the universe',
      'as if reconstructing the first 10^-43 seconds after the Big Bang',
      'from the perspective of information theory and the holographic principle',
      'examining a measurement that should be impossible yet keeps happening',
      'tracing one particle across an entire galactic supercluster',
      'where general relativity and quantum mechanics violently contradict',
      'reframed entirely around entropy, time, and irreversibility',
      'as a forensic investigation of a cosmic structure that should not exist',
    ],
  },
  markets: {
    label: 'Market Psychology & Economics',
    field:
      'institutional trading behavior, game theory, macro-economic shifts, or market psychology',
    lenses: [
      'through the lens of a hidden reflexive feedback loop',
      'focusing on a single microsecond of high-frequency order flow',
      'projecting the slow-motion collapse of an entire monetary regime',
      'as a game-theoretic standoff between a handful of unseen players',
      'examining a statistical anomaly that arbitrage somehow never erases',
      'from the perspective of crowd neuroscience and collective delusion',
      'reframed around liquidity as the only thing that truly exists',
      'as a forensic autopsy of a crisis nobody saw forming',
      'tracing one capital flow across decades and continents',
      'where incentives quietly invert and rational actors self-destruct',
    ],
  },
  biology: {
    label: 'Human Performance & Biology',
    field:
      'extreme muscle physiology, biomechanics, longevity science, or human performance optimization',
    lenses: [
      'through the lens of a single cell defying its programmed limits',
      'focusing on a microscopic molecular switch that governs aging',
      'projecting the far edge of what an optimized human body could become',
      'as a forensic study of an athlete operating beyond known physiology',
      'examining a biological paradox that should be lethal yet is survivable',
      'from the perspective of mitochondria as ancient negotiating tenants',
      'reframed around the nervous system as the true performance bottleneck',
      'tracing a single signal from intention to maximal force output',
      'where evolution and modern engineering of the body collide',
      'as if reverse-engineering longevity from organisms that barely age',
    ],
  },
  probability: {
    label: 'Probability & Quantitative Models',
    field:
      'statistical anomalies, predictive systems, Bayesian inference, or quantitative modeling',
    lenses: [
      'through the lens of a coincidence too precise to be chance',
      'focusing on a microscopic edge that compounds into certainty',
      'projecting a predictive model out to the limit where it breaks',
      'as a forensic dissection of a forecast that was catastrophically wrong',
      'examining a paradox where more data makes the answer worse',
      'from the perspective of Bayesian belief updating in real time',
      'reframed around tail risk as the only thing that ever matters',
      'tracing one improbable event back through its hidden conditional chain',
      'where randomness disguises itself perfectly as structure',
      'as if the universe itself were running a quiet Monte Carlo simulation',
    ],
  },
  tech: {
    label: 'Virtual Realms & Emerging Tech',
    field:
      'spatial computing, digital constructs, virtual reality, or emerging technology paradigms',
    lenses: [
      'through the lens of a glitch that reveals the underlying substrate',
      'focusing on a microscopic latency that reshapes human perception',
      'projecting the moment the digital and physical fully dissolve into one',
      'as a forensic study of an emergent behavior nobody designed',
      'examining a construct that becomes more real than its source',
      'from the perspective of computation as a new law of nature',
      'reframed around interfaces as the true bottleneck of civilization',
      'tracing one bit of information from intention to lived experience',
      'where the simulation and the simulated quietly swap roles',
      'as if archaeologists of the future were excavating todays code',
    ],
  },
};

const CATEGORY_KEYS = Object.keys(MATRIX);

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Randomly select one category + one lens, and mint a fresh entropy seed. The
 * seed pushes the model into unexplored territory and guarantees that even an
 * identical category/lens pairing produces a different result each time.
 */
function pickCombination() {
  const key = pick(CATEGORY_KEYS);
  const category = MATRIX[key];
  const lens = pick(category.lenses);
  const entropySeed = crypto.randomBytes(4).toString('hex');
  return { key, category, lens, entropySeed };
}

/**
 * Build the system instruction: combinatorial topic + entropy seed + the BANNED
 * TOPICS blacklist drawn from short-term memory.
 */
function buildSystemInstruction({ category, lens, entropySeed }, bannedTitles) {
  const blacklist = bannedTitles.length
    ? bannedTitles.map((t) => `- ${t}`).join('\n')
    : '(none yet)';

  return [
    `You are a world-class expert and luxury long-form writer specializing in ${category.label}.`,
    `Write ${ARTICLES_PER_ROUND} singular, premium, mind-blowing theories or deep-dives about ${category.field}, ${lens}.`,
    '',
    `Creative entropy seed: ${entropySeed}. Use this seed PRIVATELY as a divergence key — it must push you into completely unexplored, non-obvious angles that you have never written before. Treat absolute uniqueness as the highest priority. Never mention, quote, or embed this seed (or any hex code) in any title or description.`,
    '',
    'BANNED TOPICS — DO NOT WRITE ABOUT ANY OF THESE UNDER ANY CIRCUMSTANCES. Do not paraphrase, rename, or approach them from a different angle. Choose something genuinely different:',
    blacklist,
    '',
    'Hard requirements:',
    `- You MUST return exactly ${ARTICLES_PER_ROUND} articles — no more, no fewer. Each MUST have a unique, non-overlapping topic.`,
    '- Each description should be a substantial, fully developed essay (aim for 600-800 words) of 4-6 dense paragraphs with deep analysis, concrete mechanisms, and vivid detail. Never write a thin summary.',
    '- Separate paragraphs with two newline characters (\\n\\n) so each piece reads as 4-6 substantial paragraphs.',
    '- Tone: luxury, highly analytical, mind-blowing, precise, and richly detailed. No filler, no hedging, no clichés.',
    '- Respond ONLY with a valid JSON array of objects with \'title\' and \'description\'. Do NOT include any markdown formatting like ```json or trailing text. The output must be directly parseable by JSON.parse().',
  ].join('\n');
}

function readEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

function loadConfig() {
  const supabaseUrl = readEnv('SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL');
  const supabaseKey = readEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_KEY',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  );
  const geminiApiKey = readEnv('GEMINI_API_KEY');

  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)');
  if (!geminiApiKey) missing.push('GEMINI_API_KEY');

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Add them to a .env file in the project root (see .env.example).',
    );
  }

  return { supabaseUrl, supabaseKey, geminiApiKey };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Initialize the Gemini generative model with structured JSON output schema.
 * The responseSchema guarantees valid JSON from Gemini, eliminating the
 * markdown / malformed-JSON issues that plagued the previous Groq pipeline.
 */
function createGeminiModel(geminiApiKey) {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 1.0,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
          },
          required: ['title', 'description'],
        },
      },
    },
  });
}

/**
 * Extract and validate the article array from the model response. With
 * structured output the response should always be valid JSON, but we keep a
 * robust fallback parser in case of unexpected formatting.
 */
function parseArticles(content) {
  if (!content) throw new Error('Empty response from Gemini');

  let text = content.trim();

  // Strip code fences if the model somehow added them despite JSON mode.
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) text = fence[1].trim();

  if (!text.startsWith('[')) {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }
  }

  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini response was not a JSON array');
  }

  const articles = parsed
    .filter(
      (item) =>
        item &&
        typeof item.title === 'string' &&
        typeof item.description === 'string' &&
        item.title.trim() &&
        item.description.trim(),
    )
    .map((item) => ({
      title: item.title.trim(),
      description: item.description.trim(),
    }));

  if (!articles.length) {
    throw new Error('Gemini response contained no valid {title, description}');
  }

  return articles;
}

/**
 * Generate articles using the Gemini model. Throws with a `status` property
 * of 429 when rate-limited so the loop can apply the long cool-down.
 */
async function generateArticles(model, combination, bannedTitles) {
  const systemInstruction = buildSystemInstruction(combination, bannedTitles);

  const result = await model.generateContent({
    systemInstruction,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Generate ${ARTICLES_PER_ROUND} articles now as a raw JSON array.`,
          },
        ],
      },
    ],
  });

  const text = result.response.text();
  const articles = parseArticles(text);
  return articles.map((a) => ({ ...a, category: combination.key }));
}

async function insertArticles(supabase, articles) {
  const { data, error } = await supabase
    .from('facts')
    .insert(articles)
    .select('id');

  if (error) {
    // If the category column doesn't exist yet, retry without it.
    if (error.message && error.message.includes("'category'")) {
      const withoutCat = articles.map(({ category: _, ...rest }) => rest);
      const retry = await supabase.from('facts').insert(withoutCat).select('id');
      if (retry.error) {
        throw new Error(`Supabase insert failed: ${retry.error.message}`);
      }
      return retry.data?.length ?? withoutCat.length;
    }
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  return data?.length ?? articles.length;
}

/**
 * Push new titles into short-term memory, keeping only the most recent
 * MEMORY_SIZE entries (used as the BANNED TOPICS blacklist).
 */
function rememberTitles(memory, titles) {
  for (const title of titles) memory.push(title);
  if (memory.length > MEMORY_SIZE) {
    memory.splice(0, memory.length - MEMORY_SIZE);
  }
}

/**
 * Detect whether an error is a 429 rate-limit. The Gemini SDK wraps HTTP
 * errors as GoogleGenerativeAIFetchError with a `.status` property, but we
 * also defensively match the error message for broader compatibility.
 */
function isRateLimitError(error) {
  if (error.status === 429) return true;
  if (error.statusCode === 429) return true;
  if (/429|rate.?limit|quota|too many requests|resource.*exhausted/i.test(error.message)) return true;
  return false;
}

async function main() {
  const { supabaseUrl, supabaseKey, geminiApiKey } = loadConfig();
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
  const model = createGeminiModel(geminiApiKey);

  console.log('Nebulore Gemini generator starting...');
  console.log(
    `Model: ${GEMINI_MODEL} | ${ARTICLES_PER_ROUND} articles/round | ` +
      `pacing ${DELAY_MS}ms | memory ${MEMORY_SIZE} titles`,
  );
  console.log('Running as an infinite loop. Press Ctrl+C to stop.\n');

  // Short-term memory: titles of the last 100 generated articles.
  const recentTopicsMemory = [];

  let totalInserted = 0;
  let iteration = 0;

  // Infinite, auto-healing loop — designed to run unattended for days.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    iteration += 1;
    const combination = pickCombination();

    try {
      const articles = await generateArticles(
        model,
        combination,
        recentTopicsMemory,
      );

      const inserted = await insertArticles(supabase, articles);
      totalInserted += inserted;
      rememberTitles(
        recentTopicsMemory,
        articles.map((a) => a.title),
      );

      console.log(
        `[#${iteration}] +${inserted} → "${articles[0].title}" ` +
          `[${combination.category.label} | seed ${combination.entropySeed}] ` +
          `(total ${totalInserted})`,
      );
    } catch (error) {
      if (isRateLimitError(error)) {
        console.warn(
          `[#${iteration}] Rate limit hit, sleeping for ` +
            `${Math.round(RATE_LIMIT_SLEEP_MS / 1000)} seconds...`,
        );
        await sleep(RATE_LIMIT_SLEEP_MS);
        continue;
      }

      if (error instanceof SyntaxError || /JSON|parse|no valid/i.test(error.message)) {
        console.warn(
          `[#${iteration}] Bad JSON from Gemini (${error.message}); sleeping 5s and continuing.`,
        );
        await sleep(5000);
        continue;
      }

      // Any other transient error (network, Supabase, etc.): log and continue.
      console.error(`[#${iteration}] ${error.message}; sleeping 5s and continuing.`);
      await sleep(5000);
      continue;
    }

    await sleep(DELAY_MS);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Fatal: ${error.message}`);
    process.exit(1);
  });
}

/**
 * Nebulore — "Universal Free Swarm" Uncapped Library Generator (Phase 10.4)
 *
 * Standalone Node.js script that autonomously generates highly premium,
 * long-form theories using the OpenRouter API, rotating through a swarm of
 * 11 elite free models in a circular Round-Robin queue. Individual rate
 * limits are bypassed by instant failover to the next model in the ring.
 *
 * Swarm Models (all 100% free via OpenRouter):
 *   nvidia/nemotron-3-ultra-550b-a55b:free
 *   nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
 *   moonshotai/kimi-k2.6:free
 *   google/gemma-4-26b-a4b-it:free
 *   google/gemma-4-31b-it:free
 *   nvidia/nemotron-3-super-120b-a12b:free
 *   qwen/qwen3-next-80b-a3b-instruct:free
 *   openai/gpt-oss-120b:free
 *   z-ai/glm-4.5-air:free
 *   meta-llama/llama-3.3-70b-instruct:free
 *   nousresearch/hermes-3-llama-3.1-405b:free
 *
 * Architecture:
 *   1. Round-Robin Swarm — 11 models in a circular queue. Each round of 5
 *      articles advances the model index. On 429/503/404 the index instantly
 *      advances to the next model with zero sleep.
 *   2. Combinatorial Matrix — 5 categories x 10 extreme "Lenses". Each
 *      request randomly combines 1 Category + 1 Lens + a fresh crypto
 *      entropy seed so the LLM is forced into unexplored territory.
 *   3. Short-Term Memory — titles of the last 100 generated articles are
 *      fed back as a hard BANNED TOPICS blacklist.
 *   4. Auto-Healing — infinite while(true) loop wraps the OpenRouter call
 *      and Supabase batch insert in try/catch. Failover models never sleep;
 *      only truly unrecoverable errors trigger a brief 5s cool-down.
 *
 * Usage:
 *   node scripts/generate_library.js   # runs forever (Ctrl+C to stop)
 *
 * Required environment variables (loaded from .env):
 *   OPENROUTER_API_KEY               (OpenRouter API key)
 *   SUPABASE_URL                     (or EXPO_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY        (or SUPABASE_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY)
 *
 * Optional overrides:
 *   ARTICLES_PER_ROUND   (default: 5)
 *   MAX_FAILOVER_RETRIES (default: 11 — full ring rotation before sleeping)
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

// ---------------------------------------------------------------------------
// Model Swarm — Elite Round-Robin Pool
// ---------------------------------------------------------------------------
const MODEL_SWARM = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'moonshotai/kimi-k2.6:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openai/gpt-oss-120b:free',
  'z-ai/glm-4.5-air:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
];

// Circular queue index — advances after every successful round and on failover.
let modelIndex = 0;

function nextModel() {
  const model = MODEL_SWARM[modelIndex % MODEL_SWARM.length];
  modelIndex += 1;
  return model;
}

function modelShortName(id) {
  // "nvidia/nemotron-3-ultra-550b-a55b:free" -> "nemotron-3-ultra-550b-a55b"
  const slashIdx = id.indexOf('/');
  const colonIdx = id.indexOf(':');
  if (slashIdx !== -1 && colonIdx !== -1) return id.slice(slashIdx + 1, colonIdx);
  if (slashIdx !== -1) return id.slice(slashIdx + 1);
  return id;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const ARTICLES_PER_ROUND =
  Number.parseInt(process.env.ARTICLES_PER_ROUND, 10) || 5;
const MAX_FAILOVER_RETRIES =
  Number.parseInt(process.env.MAX_FAILOVER_RETRIES, 10) || MODEL_SWARM.length;
const MEMORY_SIZE = 100;

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ---------------------------------------------------------------------------
// Combinatorial Matrix: 5 categories x 10 Lenses
// ---------------------------------------------------------------------------
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

function pickCombination() {
  const key = pick(CATEGORY_KEYS);
  const category = MATRIX[key];
  const lens = pick(category.lenses);
  const entropySeed = crypto.randomBytes(4).toString('hex');
  return { key, category, lens, entropySeed };
}

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------
function buildSystemPrompt({ category, lens, entropySeed }, bannedTitles) {
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
    '- Each description MUST be a substantial, fully developed essay of at least 600 words, divided into 4-5 dense paragraphs separated by two newline characters (\\n\\n). Deep analysis, concrete mechanisms, vivid detail. Never write a thin summary.',
    '- Tone: luxury, highly analytical, mind-blowing, precise, and richly detailed. No filler, no hedging, no cliches.',
    '- Respond ONLY with a valid JSON array of objects with "title" and "description". Do NOT include any markdown formatting like ```json or trailing text. The output must be directly parseable by JSON.parse().',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------
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
  const openRouterApiKey = readEnv('OPENROUTER_API_KEY');

  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)');
  if (!openRouterApiKey) missing.push('OPENROUTER_API_KEY');

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Add them to a .env file in the project root.',
    );
  }

  return { supabaseUrl, supabaseKey, openRouterApiKey };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// OpenRouter fetch with instant failover
// ---------------------------------------------------------------------------
function parseArticles(content) {
  if (!content) throw new Error('Empty response from model');

  let text = content.trim();

  // Strip code fences if the model added them.
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
    throw new Error('Response was not a JSON array');
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
    throw new Error('Response contained no valid {title, description}');
  }

  return articles;
}

/**
 * Call the OpenRouter API for the given model. Returns parsed articles.
 * Throws with a `status` property on HTTP-level failures so the caller can
 * decide whether to failover.
 */
async function callOpenRouter(modelId, systemPrompt, openRouterApiKey) {
  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openRouterApiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Nebulore Generator',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Generate ${ARTICLES_PER_ROUND} articles now as a raw JSON array.`,
        },
      ],
      temperature: 1.0,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const err = new Error(
      `OpenRouter ${response.status}: ${response.statusText}`,
    );
    err.status = response.status;
    throw err;
  }

  const json = await response.json();

  const content =
    json.choices &&
    json.choices[0] &&
    json.choices[0].message &&
    json.choices[0].message.content;

  if (!content) {
    throw new Error('No content in OpenRouter response');
  }

  return parseArticles(content);
}

/**
 * Generate articles using the Round-Robin swarm with instant failover.
 * On 429 (Rate Limit), 503 (Busy), or 404 (Not Found), instantly advance
 * to the next model in the ring — zero sleep. Returns articles on success.
 */
async function generateWithSwarm(combination, bannedTitles, openRouterApiKey) {
  const systemPrompt = buildSystemPrompt(combination, bannedTitles);
  let lastError = null;

  for (let attempt = 0; attempt < MAX_FAILOVER_RETRIES; attempt++) {
    const modelId = nextModel();
    const shortName = modelShortName(modelId);

    try {
      const articles = await callOpenRouter(
        modelId,
        systemPrompt,
        openRouterApiKey,
      );
      return { articles, modelUsed: shortName };
    } catch (error) {
      lastError = error;
      const status = error.status || 0;

      if (status === 429 || status === 503 || status === 404) {
        // Instant failover — no sleep, just advance to the next model.
        console.warn(
          `  [Failover] ${shortName} returned ${status}. Switching to next model...`,
        );
        continue;
      }

      // Other HTTP errors or parse failures — also try next model.
      console.warn(
        `  [Failover] ${shortName} error: ${error.message}. Trying next model...`,
      );
      continue;
    }
  }

  // All models in the ring failed for this round.
  throw new Error(
    `All ${MAX_FAILOVER_RETRIES} models failed. Last error: ${lastError?.message}`,
  );
}

// ---------------------------------------------------------------------------
// Supabase insert
// ---------------------------------------------------------------------------
async function insertArticles(supabase, articles) {
  const { data, error } = await supabase
    .from('facts')
    .insert(articles)
    .select('id');

  if (error) {
    // If the category column doesn't exist yet, retry without it.
    if (error.message && error.message.includes("'category'")) {
      const withoutCat = articles.map(({ category: _, ...rest }) => rest);
      const retry = await supabase
        .from('facts')
        .insert(withoutCat)
        .select('id');
      if (retry.error) {
        throw new Error(`Supabase insert failed: ${retry.error.message}`);
      }
      return retry.data?.length ?? withoutCat.length;
    }
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  return data?.length ?? articles.length;
}

// ---------------------------------------------------------------------------
// Short-term memory
// ---------------------------------------------------------------------------
function rememberTitles(memory, titles) {
  for (const title of titles) memory.push(title);
  if (memory.length > MEMORY_SIZE) {
    memory.splice(0, memory.length - MEMORY_SIZE);
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
async function main() {
  const { supabaseUrl, supabaseKey, openRouterApiKey } = loadConfig();
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  console.log('='.repeat(70));
  console.log(' Nebulore — Universal Free Swarm Engine (Phase 10.4)');
  console.log('='.repeat(70));
  console.log(`Swarm size: ${MODEL_SWARM.length} models | ${ARTICLES_PER_ROUND} articles/round`);
  console.log(`Failover retries per round: ${MAX_FAILOVER_RETRIES}`);
  console.log(`Memory: last ${MEMORY_SIZE} titles banned`);
  console.log('Running as an infinite loop. Press Ctrl+C to stop.\n');

  const recentTopicsMemory = [];
  let totalInserted = 0;
  let round = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    round += 1;
    const combination = pickCombination();

    try {
      const { articles, modelUsed } = await generateWithSwarm(
        combination,
        recentTopicsMemory,
        openRouterApiKey,
      );

      const withCategory = articles.map((a) => ({
        ...a,
        category: combination.key,
      }));

      const inserted = await insertArticles(supabase, withCategory);
      totalInserted += inserted;
      rememberTitles(
        recentTopicsMemory,
        articles.map((a) => a.title),
      );

      console.log(
        `[Round ${round}] [${modelUsed}] -> Success: Added ${inserted} theories. ` +
          `(total: ${totalInserted})`,
      );
    } catch (error) {
      if (
        error instanceof SyntaxError ||
        /JSON|parse|no valid/i.test(error.message)
      ) {
        console.warn(
          `[Round ${round}] Bad JSON (${error.message}); sleeping 5s.`,
        );
        await sleep(5000);
        continue;
      }

      if (/All.*models failed/i.test(error.message)) {
        console.warn(
          `[Round ${round}] Full swarm exhausted. Sleeping 30s before retry...`,
        );
        await sleep(30000);
        continue;
      }

      // Any other transient error (network, Supabase, etc.): log and continue.
      console.error(
        `[Round ${round}] ${error.message}; sleeping 5s.`,
      );
      await sleep(5000);
      continue;
    }

    // Brief pacing between successful rounds to avoid hammering the API.
    await sleep(2000);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Fatal: ${error.message}`);
    process.exit(1);
  });
}

/**
 * Nebulore — Combinatorial "Anti-Repetition" Library Generator (Phase 9)
 *
 * Standalone Node.js script (NOT React Native) that autonomously generates
 * highly premium, long-form facts/theories with the Groq API and injects them
 * into the Supabase `facts` table — without ever repeating a topic.
 *
 * Architecture:
 *   1. Combinatorial Matrix — 5 categories x 7-10 extreme "Lenses". Each request
 *      randomly combines 1 Category + 1 Lens + a fresh crypto entropy seed so the
 *      LLM is forced into unexplored territory every single time.
 *   2. Short-Term Memory — the titles of the last 100 generated articles are fed
 *      back into the system prompt as a hard BANNED TOPICS blacklist.
 *   3. Auto-Healing — an infinite while(true) loop wraps the Groq fetch and the
 *      Supabase insert in try/catch. 429 rate limits and bad-JSON hallucinations
 *      are caught, logged, slept off, and the loop continues seamlessly. Designed
 *      to be left unattended for days.
 *
 * Usage:
 *   node scripts/generate_library.js            # runs forever (Ctrl+C to stop)
 *
 * Required environment variables (loaded from .env):
 *   SUPABASE_URL                 (or EXPO_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY    (preferred for inserts; or SUPABASE_KEY /
 *                                 EXPO_PUBLIC_SUPABASE_ANON_KEY as a fallback)
 *   GROQ_API_KEY                 (or EXPO_PUBLIC_GROQ_API_KEY)
 *
 * Optional overrides:
 *   GROQ_MODEL          (default: llama-3.3-70b-versatile)
 *   GROQ_MAX_TOKENS     (default: 3000 — headroom so articles never truncate)
 *   GENERATE_DELAY_MS   (default: 38000 — pacing to stay under Groq's free TPM)
 *   RATE_LIMIT_SLEEP_MS (default: 65000 — cool-down after a 429)
 *
 * NOTE on Groq free-tier limits: besides the per-minute token limit (TPM), Groq
 * also enforces a per-DAY token cap (TPD) PER MODEL — e.g. ~100k/day for
 * llama-3.3-70b-versatile and ~500k/day for llama-3.1-8b-instant. Once the daily
 * cap is reached the API returns 429 until it resets (~24h); this script simply
 * auto-heals and keeps looping, resuming automatically when the budget refreshes.
 * To accumulate tens of thousands of articles quickly, upgrade to Groq's paid
 * Dev tier (https://console.groq.com/settings/billing), which lifts the TPD cap.
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

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// llama3-8b-8192 (originally requested) was decommissioned by Groq. We default
// to llama-3.3-70b-versatile, which reliably produces premium 600+ word prose
// and well-formed JSON. For higher daily volume at lower quality/length, set
// GROQ_MODEL=llama-3.1-8b-instant (faster, ~500k TPD vs ~100k TPD, but tends to
// write shorter articles and malform JSON more often).
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
// Output cap. A 700-900 word article plus JSON overhead needs headroom so the
// response is never truncated mid-string (which yields unparseable JSON). 3000
// tokens is generous for one article yet, combined with the pacing below, stays
// well under the per-minute token reservation limit.
const MAX_TOKENS = Number.parseInt(process.env.GROQ_MAX_TOKENS, 10) || 3000;
// Groq reserves max_tokens against the per-minute budget at request time, so the
// safe rate is roughly TPM / max_tokens requests per minute. Pausing ~38s
// between requests keeps a comfortable margin under the limit while running
// unattended for days (and satisfies the 35-40s pacing requirement).
const DELAY_MS = Number.parseInt(process.env.GENERATE_DELAY_MS, 10) || 38000;
// Cool-down applied when a 429 rate-limit error is caught.
const RATE_LIMIT_SLEEP_MS =
  Number.parseInt(process.env.RATE_LIMIT_SLEEP_MS, 10) || 65000;
// How many recent titles to remember and ban from future generations.
const MEMORY_SIZE = 100;

/**
 * The Combinatorial Matrix: 5 categories, each with a set of 7-10 extreme
 * "Lenses" / perspectives. Randomly combining a category with a lens (plus a
 * per-request entropy seed) yields an enormous, effectively non-repeating space
 * of premium topics. `key` must match the category keys used by the app
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
 * Build the system prompt: combinatorial topic + entropy seed + the BANNED
 * TOPICS blacklist drawn from short-term memory.
 */
function buildSystemPrompt({ category, lens, entropySeed }, bannedTitles) {
  const blacklist = bannedTitles.length
    ? bannedTitles.map((t) => `- ${t}`).join('\n')
    : '(none yet)';

  return [
    `You are a world-class expert and luxury long-form writer specializing in ${category.label}.`,
    `Write ONE singular, premium, mind-blowing theory or deep-dive about ${category.field}, ${lens}.`,
    '',
    `Creative entropy seed: ${entropySeed}. Use this seed PRIVATELY as a divergence key — it must push you into a completely unexplored, non-obvious angle that you have never written before. Treat absolute uniqueness as the highest priority. Never mention, quote, or embed this seed (or any hex code) in the title or description.`,
    '',
    'BANNED TOPICS — DO NOT WRITE ABOUT ANY OF THESE UNDER ANY CIRCUMSTANCES. Do not paraphrase, rename, or approach them from a different angle. Choose something genuinely different:',
    blacklist,
    '',
    'Hard requirements:',
    '- The article description MUST be 700-900 words. Aim for roughly 800 words. Going below 600 words is a failure — count as you write and keep expanding with deeper analysis until you are well past 600 — but you must also fully finish and close the JSON within the word budget.',
    '- Separate paragraphs with two newline characters (\\n\\n) so the piece reads as 4-6 substantial paragraphs.',
    '- Tone: luxury, highly analytical, mind-blowing, precise, and richly detailed. No filler, no hedging, no clichés.',
    "- Output STRICTLY as a raw JSON array containing exactly ONE object with 'title' and 'description' string keys.",
    '- Do NOT use markdown, code fences, commentary, or any text outside the JSON array. Return raw JSON only.',
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
  const groqApiKey = readEnv('GROQ_API_KEY', 'EXPO_PUBLIC_GROQ_API_KEY');

  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)');
  if (!groqApiKey) missing.push('GROQ_API_KEY');

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Add them to a .env file in the project root (see .env.example).',
    );
  }

  return { supabaseUrl, supabaseKey, groqApiKey };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Error subclass used to signal a 429 so the loop can apply the long cool-down.
 */
class RateLimitError extends Error {}

/**
 * Models frequently emit literal newlines/tabs inside JSON string values (which
 * is invalid JSON). Escape only the control characters that fall *inside* string
 * literals, leaving structural whitespace untouched, so we can recover responses
 * that would otherwise be discarded.
 */
function escapeControlCharsInStrings(text) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
      out += ch;
      continue;
    }
    out += ch;
    if (ch === '"') inString = true;
  }
  return out;
}

/**
 * Extract a JSON array from a model response, tolerating accidental markdown
 * fences or surrounding prose even though we asked for raw JSON.
 */
function parseArticles(content) {
  if (!content) throw new Error('Empty response from Groq');

  let text = content.trim();

  // Strip ```json ... ``` or ``` ... ``` fences if the model added them.
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) text = fence[1].trim();

  // Fall back to slicing from the first '[' to the last ']'.
  if (!text.startsWith('[')) {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    // Retry after escaping raw control characters inside string literals.
    parsed = JSON.parse(escapeControlCharsInStrings(text));
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Groq response was not a JSON array');
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
    throw new Error('Groq response contained no valid {title, description}');
  }

  return articles;
}

async function generateArticles(groqApiKey, combination, bannedTitles) {
  const systemPrompt = buildSystemPrompt(combination, bannedTitles);

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            'Generate the single article now as a raw JSON array with one object.',
        },
      ],
      temperature: 0.9,
      max_tokens: MAX_TOKENS,
    }),
  });

  if (response.status === 429) {
    const body = await response.text().catch(() => '');
    throw new RateLimitError(`Groq 429 rate limit: ${body.slice(0, 200)}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Groq request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  const articles = parseArticles(content);
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

async function main() {
  const { supabaseUrl, supabaseKey, groqApiKey } = loadConfig();
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  console.log('Nebulore combinatorial generator starting...');
  console.log(
    `Model: ${GROQ_MODEL} | pacing ${Math.round(DELAY_MS / 1000)}s/request | ` +
      `${CATEGORY_KEYS.length} categories | memory ${MEMORY_SIZE} titles`,
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
        groqApiKey,
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
      if (error instanceof RateLimitError) {
        console.warn(
          `[#${iteration}] Rate limit hit, sleeping for ` +
            `${Math.round(RATE_LIMIT_SLEEP_MS / 1000)} seconds...`,
        );
        await sleep(RATE_LIMIT_SLEEP_MS);
        continue;
      }

      if (error instanceof SyntaxError || /JSON|parse|no valid/i.test(error.message)) {
        console.warn(
          `[#${iteration}] Bad JSON from Groq (${error.message}); sleeping 5s and continuing.`,
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

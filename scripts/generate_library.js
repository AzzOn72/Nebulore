/**
 * Nebulore — Automated Library Generator
 *
 * Standalone Node.js script (NOT React Native) that continuously generates
 * long-form, premium science articles with the Groq API and injects them into
 * the Supabase `facts` table.
 *
 * Usage:
 *   node scripts/generate_library.js            # runs until stopped (Ctrl+C)
 *   node scripts/generate_library.js --rounds=100   # runs a fixed number of rounds
 *
 * Required environment variables (loaded from .env):
 *   SUPABASE_URL                 (or EXPO_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY    (preferred for inserts; or SUPABASE_KEY /
 *                                 EXPO_PUBLIC_SUPABASE_ANON_KEY as a fallback)
 *   GROQ_API_KEY                 (or EXPO_PUBLIC_GROQ_API_KEY)
 */

require('dotenv').config();

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
// llama3-8b-8192 (requested) was decommissioned by Groq. We default to
// llama-3.3-70b-versatile, which reliably produces premium long-form articles;
// override with GROQ_MODEL (e.g. llama-3.1-8b-instant for the faster 8B model).
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const ARTICLES_PER_ROUND = 5;
// Output cap. Kept under Groq's free-tier per-request TPM limit (6000) while
// still leaving room for 5 long articles. Override with GROQ_MAX_TOKENS.
const MAX_TOKENS = Number.parseInt(process.env.GROQ_MAX_TOKENS, 10) || 5800;
// Delay between rounds. Free tier (~6000 TPM) realistically allows ~1 round/min;
// raise GENERATE_DELAY_MS on free tier to avoid rate limits.
const DELAY_MS = Number.parseInt(process.env.GENERATE_DELAY_MS, 10) || 4000;

const CATEGORIES = [
  {
    key: 'cosmos',
    label: 'Cosmos & Quantum Physics',
    prompt:
      'astrophysics, quantum mechanics, cosmology, spacetime, or particle physics',
  },
  {
    key: 'markets',
    label: 'Market Psychology & Economics',
    prompt:
      'institutional trading behavior, game theory, macro-economic shifts, or market psychology',
  },
  {
    key: 'biology',
    label: 'Human Performance & Biology',
    prompt:
      'extreme muscle physiology, biomechanics, longevity science, or human performance optimization',
  },
  {
    key: 'probability',
    label: 'Probability & Quantitative Models',
    prompt:
      'statistical anomalies, predictive systems, Bayesian inference, or quantitative modeling',
  },
  {
    key: 'tech',
    label: 'Virtual Realms & Emerging Tech',
    prompt:
      'spatial computing, digital constructs, virtual reality, or emerging technology paradigms',
  },
];

function pickCategory() {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
}

function buildPrompt(category) {
  return (
    `You are a world-class expert in ${category.label}. Generate 5 highly ` +
    `detailed, mind-blowing, long-form articles about ${category.prompt}. ` +
    'Each article must be deeply explained, fascinating, and at least 600 words ' +
    'long (this length requirement is critical — do not write short articles). ' +
    'Within each description, separate paragraphs with two newline characters ' +
    '(\\n\\n) so the article has 4-5 substantial paragraphs. Output ' +
    'strictly as a JSON array of objects with \'title\' and \'description\' keys. ' +
    'Do not use markdown wrappers, just raw JSON.'
  );
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

function parseRounds() {
  const arg = process.argv.find((a) => a.startsWith('--rounds='));
  if (!arg) return Infinity;
  const value = Number.parseInt(arg.split('=')[1], 10);
  return Number.isFinite(value) && value > 0 ? value : Infinity;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  } catch (error) {
    throw new Error(`Could not parse Groq response as JSON: ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Groq response was not a JSON array');
  }

  return parsed
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
}

function attachCategory(articles, categoryKey) {
  return articles.map((a) => ({ ...a, category: categoryKey }));
}

async function generateArticles(groqApiKey, category) {
  const prompt = buildPrompt(category);
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Generate the 5 articles now as raw JSON.' },
      ],
      temperature: 0.9,
      max_tokens: MAX_TOKENS,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${body}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  const articles = parseArticles(content);
  return attachCategory(articles, category.key);
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

async function main() {
  const { supabaseUrl, supabaseKey, groqApiKey } = loadConfig();
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const maxRounds = parseRounds();
  const roundsLabel = maxRounds === Infinity ? 'until stopped' : `${maxRounds} round(s)`;

  console.log('Nebulore library generator starting...');
  console.log(`Model: ${GROQ_MODEL} | ${ARTICLES_PER_ROUND} articles/round | ${roundsLabel}`);
  console.log('Press Ctrl+C to stop gracefully.\n');

  let stopping = false;
  process.on('SIGINT', () => {
    if (stopping) process.exit(1);
    stopping = true;
    console.log('\nStopping after the current round...');
  });

  let totalInserted = 0;
  let round = 0;

  while (round < maxRounds && !stopping) {
    round += 1;
    try {
      const category = pickCategory();
      const articles = await generateArticles(groqApiKey, category);

      if (!articles.length) {
        console.warn(`[round ${round}] No valid articles parsed; retrying after delay.`);
      } else {
        const inserted = await insertArticles(supabase, articles);
        totalInserted += inserted;
        console.log(
          `Successfully added ${inserted} new theories to the void... ` +
            `[${category.label}] (round ${round}, total ${totalInserted})`,
        );
      }
    } catch (error) {
      console.error(`[round ${round}] ${error.message}`);
    }

    if (round < maxRounds && !stopping) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone. Inserted ${totalInserted} theories across ${round} round(s).`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Fatal: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { parseArticles, loadConfig, parseRounds };

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELS = ['llama3-8b-8192', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];

function buildSystemPrompt(factTitle) {
  return `You are an expert astrophysicist and quantum mechanic. Explain the following fact in 3 concise, mind-blowing paragraphs. Use a captivating, premium tone. Fact: ${factTitle}`;
}

async function requestCompletion(model, factTitle, apiKey) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(factTitle) },
        {
          role: 'user',
          content: 'Provide your explanation now.',
        },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `Groq request failed (${response.status})`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from Groq');
  }

  return content.trim();
}

export async function fetchDiveDeeper(factTitle) {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Groq API key is not configured');
  }

  let lastError;

  for (const model of MODELS) {
    try {
      return await requestCompletion(model, factTitle, apiKey);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Groq request failed');
}

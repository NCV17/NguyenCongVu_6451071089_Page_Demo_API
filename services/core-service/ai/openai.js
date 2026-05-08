// services/core-service/ai/openai.js
// Kết nối OpenAI API — gọi chat completion với retry

const https = require("https");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || "10000");

/**
 * Gọi OpenAI Chat Completion API
 *
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {number} retries - số lần retry nếu fail
 * @returns {Promise<string>} - nội dung trả về từ model
 */
async function callOpenAI(systemPrompt, userMessage, retries = 2) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY chưa được cấu hình trong .env");
  }

  const body = JSON.stringify({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,       // thấp → ổn định, dễ parse JSON
    max_tokens: 200,
    response_format: { type: "json_object" }, // force JSON output
  });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await httpPost(
        "api.openai.com",
        "/v1/chat/completions",
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Length": Buffer.byteLength(body),
        },
        body,
        OPENAI_TIMEOUT_MS
      );

      const parsed = JSON.parse(result);

      if (parsed.error) {
        throw new Error(`OpenAI API Error: ${parsed.error.message}`);
      }

      return parsed.choices[0].message.content;
    } catch (err) {
      if (attempt === retries) throw err;

      const delay = (attempt + 1) * 1000;
      console.warn(`⚠️  OpenAI attempt ${attempt + 1} failed, retry in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

// ── Helper: HTTP POST thuần Node (không cần axios) ──────────────────────────
function httpPost(hostname, path, headers, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: "POST", headers },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`OpenAI request timeout after ${timeoutMs}ms`));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { callOpenAI };

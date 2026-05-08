// services/core-service/ai/classify.js
// Phân loại intent + sentiment qua OpenAI

const { callOpenAI } = require("./openai");

/**
 * System prompt ngắn gọn — OpenAI sẽ trả về JSON thuần
 */
const SYSTEM_PROMPT = `Bạn là hệ thống phân loại bình luận mạng xã hội.
Phân tích đoạn văn bản người dùng và trả về JSON với 2 trường:

- "intent": một trong các giá trị:
    "hoi_gia" | "khieu_nai" | "khen" | "hoi_thong_tin" | "tuong_tac_tich_cuc" | "spam" | "khac"

- "sentiment": một trong các giá trị:
    "tich_cuc" | "tieu_cuc" | "trung_tinh"

Chỉ trả về JSON, không giải thích thêm.
Ví dụ: {"intent":"khen","sentiment":"tich_cuc"}`;

/**
 * Phân loại một văn bản
 *
 * @param {string} text - nội dung comment / bài đăng
 * @returns {Promise<{intent: string, sentiment: string}>}
 */
async function classifyText(text) {
  if (!text || text.trim().length === 0) {
    return { intent: "khac", sentiment: "trung_tinh" };
  }

  try {
    const raw = await callOpenAI(SYSTEM_PROMPT, text);

    // Parse JSON từ response
    const result = JSON.parse(raw);

    // Validate các trường trả về
    const validIntents = [
      "hoi_gia",
      "khieu_nai",
      "khen",
      "hoi_thong_tin",
      "tuong_tac_tich_cuc",
      "spam",
      "khac",
    ];
    const validSentiments = ["tich_cuc", "tieu_cuc", "trung_tinh"];

    const intent = validIntents.includes(result.intent)
      ? result.intent
      : "khac";

    const sentiment = validSentiments.includes(result.sentiment)
      ? result.sentiment
      : "trung_tinh";

    return { intent, sentiment };
  } catch (err) {
    console.error("❌ classifyText error:", err.message);

    // Fallback khi AI fail → không block pipeline
    return { intent: "khac", sentiment: "trung_tinh" };
  }
}

module.exports = { classifyText };

// services/core-service/ai/spamDetector.js
// Detect spam KHÔNG cần AI — nhanh, nhẹ, chạy trước

/**
 * Danh sách từ khoá spam phổ biến (tiếng Việt + tiếng Anh)
 */
const SPAM_KEYWORDS = [
  // Scam / lừa đảo
  "trúng thưởng",
  "nhận tiền ngay",
  "kiếm tiền online",
  "đầu tư sinh lời",
  "nhấp vào link",
  "click vào đây",
  "miễn phí 100%",
  "làm giàu nhanh",
  "cơ hội vàng",
  "tuyển cộng tác viên",
  "thu nhập khủng",
  "free money",
  "earn money fast",
  "win prize",
  "click here now",
  "limited offer",
  "act now",
  "congratulations you won",

  // Spam quảng cáo
  "giảm giá sốc",
  "mua ngay",
  "liên hệ zalo",
  "inbox ngay",
  "dm ngay",
  "order ngay",

  // Từ ngữ nhạy cảm
  "súng",
  "ma tuý",
  "cờ bạc",
  "casino",
  "bet",
  "gambling",
];

/**
 * Pattern detect link URL
 */
const URL_PATTERN =
  /https?:\/\/[^\s]+|www\.[^\s]+|bit\.ly\/[^\s]+|t\.me\/[^\s]+|tinyurl\.com\/[^\s]+/gi;

/**
 * Pattern detect số điện thoại (VN format)
 */
const PHONE_PATTERN = /(\+84|0)[3|5|7|8|9][0-9]{8}/g;

/**
 * Kiểm tra spam theo rule-based
 *
 * @param {string} text - nội dung comment / post
 * @returns {{
 *   isSpam: boolean,
 *   score: number,        // 0–100
 *   reasons: string[]     // lý do bị đánh dấu spam
 * }}
 */
function detectSpam(text) {
  if (!text || typeof text !== "string") {
    return { isSpam: false, score: 0, reasons: [] };
  }

  const lower = text.toLowerCase();
  const reasons = [];
  let score = 0;

  // ── 1. Kiểm tra link ──────────────────────────────────────────
  const links = text.match(URL_PATTERN);
  if (links && links.length > 0) {
    score += 40;
    reasons.push(`Chứa link: ${links.join(", ")}`);
  }

  // ── 2. Kiểm tra spam keywords ────────────────────────────────
  const foundKeywords = SPAM_KEYWORDS.filter((kw) => lower.includes(kw));
  if (foundKeywords.length > 0) {
    score += foundKeywords.length * 15;
    reasons.push(`Từ khoá spam: ${foundKeywords.join(", ")}`);
  }

  // ── 3. Chứa số điện thoại ────────────────────────────────────
  const phones = text.match(PHONE_PATTERN);
  if (phones && phones.length > 0) {
    score += 20;
    reasons.push(`Chứa SĐT: ${phones.join(", ")}`);
  }

  // ── 4. Lặp ký tự bất thường (aaaa, !!!!, ....) ──────────────
  if (/(.)\1{4,}/.test(text)) {
    score += 10;
    reasons.push("Lặp ký tự bất thường");
  }

  // ── 5. Viết HOA TOÀN BỘ (>70% là chữ hoa) ──────────────────
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 10) {
    const upperRatio = letters.replace(/[^A-Z]/g, "").length / letters.length;
    if (upperRatio > 0.7) {
      score += 15;
      reasons.push("Viết hoa quá nhiều");
    }
  }

  // Cap score tại 100
  score = Math.min(score, 100);

  return {
    isSpam: score >= 40,
    score,
    reasons,
  };
}

module.exports = { detectSpam };

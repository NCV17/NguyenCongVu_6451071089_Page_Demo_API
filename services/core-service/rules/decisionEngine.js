// services/core-service/rules/decisionEngine.js
// Ra quyết định tự động dựa trên kết quả spam + AI classify

/**
 * Blacklist nội bộ — lưu trong memory (production nên dùng Redis)
 * Map<userId, { count: number, firstSeen: Date }>
 */
const spamHistory = new Map();

/**
 * Thời gian cửa sổ theo dõi spam lặp: 24 giờ (ms)
 */
const SPAM_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Ghi nhận spam cho user, trả về số lần spam trong 24h
 */
function recordSpam(userId) {
  if (!userId) return 0;

  const now = Date.now();
  const record = spamHistory.get(userId);

  if (!record || now - record.firstSeen > SPAM_WINDOW_MS) {
    // Reset nếu quá 24h
    spamHistory.set(userId, { count: 1, firstSeen: now });
    return 1;
  }

  record.count += 1;
  return record.count;
}

/**
 * Lấy số lần spam của user trong 24h (không ghi nhận thêm)
 */
function getSpamCount(userId) {
  if (!userId) return 0;
  const record = spamHistory.get(userId);
  if (!record) return 0;
  if (Date.now() - record.firstSeen > SPAM_WINDOW_MS) return 0;
  return record.count;
}

/**
 * Engine ra quyết định
 *
 * @param {{
 *   event: object,           // parsed event từ Kafka
 *   spamResult: {isSpam: boolean, score: number, reasons: string[]},
 *   aiResult:   {intent: string, sentiment: string} | null
 * }} context
 *
 * @returns {{
 *   action: string,          // "none" | "hide_comment" | "blacklist_user" | "queue_review"
 *   reason: string,
 *   severity: string         // "low" | "medium" | "high"
 * }}
 */
function decide({ event, spamResult, aiResult }) {
  const userId = event?.sender_name || event?.sender_id || "facebook-user";
  const text = event?.message || "";

  // ── RULE 1: Link độc hại hoặc scam bot rõ ràng ─────────────────────────────
  // Score rất cao (≥80) → ẩn ngay + đẩy vào hàng chờ review thủ công
  if (spamResult.isSpam && spamResult.score >= 80) {
    const spamCount = recordSpam(userId);

    // Tái phạm nhiều lần → đề xuất block thủ công
    if (spamCount >= 3) {
      return {
        action: "blacklist_user",
        reason: `Scam/spam nặng, tái phạm ${spamCount} lần trong 24h. Lý do: ${spamResult.reasons.join("; ")}`,
        severity: "high",
      };
    }

    return {
      action: "queue_review",
      reason: `Phát hiện link độc hại / scam. Score: ${spamResult.score}. Lý do: ${spamResult.reasons.join("; ")}`,
      severity: "high",
    };
  }

  // ── RULE 2: Spam nhẹ (score 40–79) → ẩn bình luận ngay ───────────────────
  if (spamResult.isSpam && spamResult.score >= 40) {
    const spamCount = recordSpam(userId);

    // Spam lặp lại ≥3 lần trong 24h → blacklist
    if (spamCount >= 3) {
      return {
        action: "blacklist_user",
        reason: `Spam lặp lại ${spamCount} lần trong 24h. Lý do: ${spamResult.reasons.join("; ")}`,
        severity: "high",
      };
    }

    return {
      action: "hide_comment",
      reason: `Spam nhẹ. Score: ${spamResult.score}. Lý do: ${spamResult.reasons.join("; ")}`,
      severity: "medium",
    };
  }

  // ── RULE 3: AI phát hiện intent = spam ────────────────────────────────────
  if (aiResult?.intent === "spam") {
    const spamCount = recordSpam(userId);

    if (spamCount >= 3) {
      return {
        action: "blacklist_user",
        reason: `AI detect spam intent, tái phạm ${spamCount} lần`,
        severity: "high",
      };
    }

    return {
      action: "hide_comment",
      reason: "AI classify: intent = spam",
      severity: "medium",
    };
  }

  // ── RULE 4: Sentiment tiêu cực + khiếu nại → không xử lý tự động ─────────
  // Để admin review, không ẩn (tránh ẩn nhầm feedback hợp lệ)
  if (aiResult?.intent === "khieu_nai" && aiResult?.sentiment === "tieu_cuc") {
    return {
      action: "none",
      reason: "Khiếu nại tiêu cực — cần admin xem xét, không ẩn tự động",
      severity: "low",
    };
  }

  // ── DEFAULT: Không làm gì ──────────────────────────────────────────────────
  return {
    action: "none",
    reason: "Bình luận bình thường",
    severity: "low",
  };
}

module.exports = { decide, getSpamCount };

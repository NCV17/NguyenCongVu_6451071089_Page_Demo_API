// services/core-service/actions/hideComment.js
// Thực thi hành động với Facebook Graph API + persistent stores

const https = require("https");

const { addToBlacklist } = require("../store/blacklist");
const { enqueue }        = require("../store/reviewQueue");

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || "";
const FB_API_VERSION    = process.env.FB_API_VERSION || "v19.0";

// ── Helper: gọi Facebook Graph API ────────────────────────────────────────
function fbRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;

    const options = {
      hostname: "graph.facebook.com",
      path: `/${FB_API_VERSION}${path}`,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(bodyStr && { "Content-Length": Buffer.byteLength(bodyStr) }),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });

    req.setTimeout(8000, () => {
      req.destroy(new Error("Facebook API timeout"));
    });

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

/**
 * Ẩn comment trên Facebook Page
 * @param {string} commentId
 * @returns {Promise<{success: boolean, result: object}>}
 */
async function hideComment(commentId) {
  if (!commentId) {
    return { success: false, result: { error: "commentId is required" } };
  }

  if (!PAGE_ACCESS_TOKEN) {
    console.warn("⚠️  PAGE_ACCESS_TOKEN chưa cấu hình — giả lập hide OK");
    // Mock thành công để pipeline không bị block khi chưa có token
    return { success: true, result: { mocked: true } };
  }

  try {
    const result = await fbRequest(
      "POST",
      `/${commentId}?is_hidden=true&access_token=${PAGE_ACCESS_TOKEN}`
    );

    if (result.success) {
      console.log(`✅ Đã ẩn comment: ${commentId}`);
    } else {
      console.warn(`⚠️  Ẩn comment thất bại:`, JSON.stringify(result));
    }

    return { success: !!result.success, result };
  } catch (err) {
    console.error(`❌ hideComment error:`, err.message);
    return { success: false, result: { error: err.message } };
  }
}

/**
 * Đưa comment vào hàng chờ review thủ công (lưu file JSON)
 * @param {string} commentId
 * @param {string} reason
 * @param {object} extra - thêm context (userId, message, spamScore...)
 */
async function queueForReview(commentId, reason, extra = {}) {
  enqueue({ commentId, reason, ...extra });
}

/**
 * Ghi nhận user vào blacklist nội bộ (lưu file JSON)
 * Không gửi auto-reply nữa sau khi blacklist
 * @param {string} userId
 * @param {string} reason
 */
async function blacklistUser(userId, reason) {
  addToBlacklist(userId, reason);

  // TODO (production): gọi Facebook API block user nếu đã xác thực endpoint
  // const result = await fbRequest("POST", `/${PAGE_ID}/blocked?user=${userId}&access_token=${PAGE_ACCESS_TOKEN}`);
}

module.exports = { hideComment, queueForReview, blacklistUser };

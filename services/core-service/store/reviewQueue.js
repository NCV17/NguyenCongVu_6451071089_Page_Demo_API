// services/core-service/store/reviewQueue.js
// Hàng chờ review thủ công — lưu vào file JSON

const fs   = require("fs");
const path = require("path");

const STORE_PATH = path.join(__dirname, "data", "reviewQueue.json");

function ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  try {
    ensureDir();
    if (!fs.existsSync(STORE_PATH)) return [];
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {
    return [];
  }
}

function save(data) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Đưa item vào hàng chờ review
 * @param {{commentId, userId, message, reason, spamScore}} item
 */
function enqueue(item) {
  const queue = load();
  queue.push({
    ...item,
    status: "pending",
    enqueuedAt: new Date().toISOString(),
  });
  save(queue);
  console.log(`📋 [REVIEW QUEUE] commentId=${item.commentId} | reason=${item.reason}`);
}

/**
 * Lấy toàn bộ queue (để admin xem)
 * @returns {object[]}
 */
function getAll() {
  return load();
}

/**
 * Đánh dấu item đã review xong
 * @param {string} commentId
 * @param {string} status - "approved" | "rejected"
 */
function markReviewed(commentId, status = "reviewed") {
  const queue = load();
  const item = queue.find((q) => q.commentId === commentId);
  if (item) {
    item.status = status;
    item.reviewedAt = new Date().toISOString();
    save(queue);
  }
}

/**
 * Xoá item khỏi queue
 * @param {string} commentId
 */
function remove(commentId) {
  const queue = load().filter((q) => q.commentId !== commentId);
  save(queue);
}

module.exports = { enqueue, getAll, markReviewed, remove };

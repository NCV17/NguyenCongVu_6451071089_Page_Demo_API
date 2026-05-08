// services/core-service/store/blacklist.js
// Blacklist nội bộ — lưu vào file JSON (production nên dùng Redis/DB)

const fs   = require("fs");
const path = require("path");

const STORE_PATH = path.join(__dirname, "data", "blacklist.json");

// Đảm bảo thư mục data tồn tại
function ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Đọc store từ file
function load() {
  try {
    ensureDir();
    if (!fs.existsSync(STORE_PATH)) return {};
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {
    return {};
  }
}

// Ghi store xuống file
function save(data) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Thêm user vào blacklist
 * @param {string} userId
 * @param {string} reason
 */
function addToBlacklist(userId, reason) {
  if (!userId) return;
  const store = load();
  store[userId] = {
    userId,
    reason,
    blacklistedAt: new Date().toISOString(),
  };
  save(store);
  console.warn(`🚫 [BLACKLIST] userId=${userId} đã bị blacklist. Lý do: ${reason}`);
}

/**
 * Kiểm tra user có trong blacklist không
 * @param {string} userId
 * @returns {boolean}
 */
function isBlacklisted(userId) {
  if (!userId) return false;
  const store = load();
  return !!store[userId];
}

/**
 * Xoá user khỏi blacklist
 * @param {string} userId
 */
function removeFromBlacklist(userId) {
  const store = load();
  delete store[userId];
  save(store);
}

/**
 * Lấy toàn bộ danh sách blacklist
 * @returns {object[]}
 */
function getAll() {
  return Object.values(load());
}

module.exports = { addToBlacklist, isBlacklisted, removeFromBlacklist, getAll };

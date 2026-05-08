// services/core-service/consumer.js
// AI Consumer — xử lý raw_events qua pipeline:
//   raw_events → [blacklist check] → spam detector → AI classify → decision engine → action

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const { Kafka } = require("kafkajs");

const { detectSpam } = require("./ai/spamDetector");
const { classifyText } = require("./ai/classify");
const { decide } = require("./rules/decisionEngine");
const {
  hideComment,
  queueForReview,
  blacklistUser,
} = require("./actions/hideComment");
const { isBlacklisted } = require("./store/blacklist");

// ── Kafka config ───────────────────────────────────────────────────────────
const kafka = new Kafka({
  clientId: "core-service-ai-consumer",
  brokers: [process.env.KAFKA_BROKER || "localhost:29092"],
});

const consumer = kafka.consumer({ groupId: "core-service-group" });

const TOPIC = process.env.TOPIC_NAME || "raw_events";

// ── Pipeline chính ─────────────────────────────────────────────────────────
async function processEvent(event) {
  const text = event.message || "";
  const commentId = event.comment_id || null;
  const userId = event.sender_name || event.sender_id || "facebook-user";
  const eventType = event.type || "unknown";

  console.log("\n┌─────────────────────────────────────────────");
  console.log(
    `│ 📨 Event: ${eventType} | comment: ${commentId} | user: ${userId}`,
  );
  console.log(
    `│ 💬 "${text.substring(0, 80)}${text.length > 80 ? "..." : ""}"`,
  );
  console.log("├─────────────────────────────────────────────");

  // ── BƯỚC 0: Kiểm tra Blacklist ─────────────────────────────────────────
  // User đã blacklist → ẩn ngay, KHÔNG auto-reply, bỏ qua toàn bộ pipeline
  if (userId && isBlacklisted(userId)) {
    console.log(`│ 🚫 User ${userId} đang trong BLACKLIST`);
    console.log("│    → Ẩn comment, không auto-reply, bỏ qua pipeline");

    if (commentId) {
      const { success } = await hideComment(commentId);
      console.log(
        `│ ${success ? "✅" : "⚠️ "} hide_comment (blacklisted): ${success ? "OK" : "FAILED"}`,
      );
    }

    console.log("└─────────────────────────────────────────────\n");
    return;
  }

  // ── BƯỚC 1: Spam Detector (rule-based, không cần AI) ──────────────────
  const spamResult = detectSpam(text);
  console.log(
    `│ 🔍 Spam: isSpam=${spamResult.isSpam} | score=${spamResult.score}`,
  );
  if (spamResult.reasons.length > 0) {
    console.log(`│    Lý do: ${spamResult.reasons.join("; ")}`);
  }

  // ── BƯỚC 2: AI Classify ────────────────────────────────────────────────
  // Chỉ gọi khi: có API key + không phải scam nặng + có text
  let aiResult = null;

  if (process.env.OPENAI_API_KEY && spamResult.score < 80 && text.length > 0) {
    try {
      console.log("│ 🤖 Gọi AI classify...");
      aiResult = await classifyText(text);
      console.log(
        `│ 🤖 AI: intent=${aiResult.intent} | sentiment=${aiResult.sentiment}`,
      );
    } catch (err) {
      console.warn(`│ ⚠️  AI classify failed: ${err.message}`);
    }
  } else if (!process.env.OPENAI_API_KEY) {
    console.log("│ ℹ️  OPENAI_API_KEY chưa cấu hình — bỏ qua AI classify");
  } else if (spamResult.score >= 80) {
    console.log("│ ⚡ Spam score ≥80 — bỏ qua AI, xử lý nhanh");
  }

  // ── BƯỚC 3: Decision Engine ────────────────────────────────────────────
  const decision = decide({ event, spamResult, aiResult });
  console.log(
    `│ ⚖️  Decision: action=${decision.action} | severity=${decision.severity}`,
  );
  console.log(`│    Reason: ${decision.reason}`);
  console.log("├─────────────────────────────────────────────");

  // ── BƯỚC 4: Thực thi hành động ────────────────────────────────────────
  switch (decision.action) {
    case "hide_comment": {
      if (commentId) {
        const { success } = await hideComment(commentId);
        console.log(
          `│ ${success ? "✅" : "⚠️ "} hide_comment: ${success ? "OK" : "FAILED"}`,
        );
      } else {
        console.log("│ ⚠️  hide_comment: không có commentId");
      }
      break;
    }

    case "queue_review": {
      // Ẩn trước khi đưa vào hàng chờ
      if (commentId) await hideComment(commentId);
      await queueForReview(commentId, decision.reason, {
        userId,
        message: text,
        spamScore: spamResult.score,
      });
      console.log("│ 📋 Đã ẩn + đẩy vào hàng chờ review thủ công");
      break;
    }

    case "blacklist_user": {
      // Blacklist user, ẩn comment, KHÔNG gửi auto-reply nữa
      await blacklistUser(userId, decision.reason);
      if (commentId) await hideComment(commentId);
      await queueForReview(commentId, `[BLACKLISTED] ${decision.reason}`, {
        userId,
        message: text,
        spamScore: spamResult.score,
      });
      console.log(
        `│ 🚫 User ${userId} đã bị blacklist + ẩn comment + vào queue review`,
      );
      break;
    }

    case "none":
    default:
      console.log("│ ✅ Bình luận bình thường — không cần xử lý");
      break;
  }

  console.log("└─────────────────────────────────────────────\n");
}

// ── Kafka Consumer runner ──────────────────────────────────────────────────
const runConsumer = async () => {
  try {
    console.log("🚀 Core Service AI Consumer starting...");
    console.log(`   Kafka: ${process.env.KAFKA_BROKER || "localhost:29092"}`);
    console.log(`   Topic: ${TOPIC}`);
    console.log(
      `   AI:    ${process.env.OPENAI_API_KEY ? "✅ OpenAI enabled" : "⚠️  OpenAI disabled (no API key)"}`,
    );
    console.log(
      `   FB:    ${process.env.PAGE_ACCESS_TOKEN ? "✅ FB API enabled" : "⚠️  FB API mocked (no token)"}`,
    );
    console.log("");

    await consumer.connect();
    console.log("✅ Kafka Consumer connected");

    await consumer.subscribe({ topic: TOPIC, fromBeginning: false });
    console.log(`📡 Subscribed to topic: ${TOPIC}`);
    console.log("⏳ Waiting for events...\n");

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        let event;
        try {
          event = JSON.parse(message.value.toString());
        } catch (parseErr) {
          console.error("❌ JSON parse error:", parseErr.message);
          return;
        }

        try {
          await processEvent(event);
        } catch (err) {
          // Log lỗi nhưng KHÔNG crash — consumer phải tiếp tục chạy
          console.error("❌ processEvent error:", err.message);
        }
      },
    });
  } catch (err) {
    console.error("❌ Consumer fatal error:", err.message);
    process.exit(1);
  }
};

// ── Graceful shutdown ──────────────────────────────────────────────────────
const shutdown = async () => {
  console.log("\n🛑 Shutting down consumer...");
  await consumer.disconnect();
  console.log("✅ Consumer disconnected");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ── Entry point ────────────────────────────────────────────────────────────
if (require.main === module) {
  runConsumer();
}

module.exports = { runConsumer };

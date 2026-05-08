const express = require("express");
const router = express.Router();

const { sendEvent } = require("../kafka/producer");
const { normalizeFacebookEvent } = require("../utils/normalize");

require("dotenv").config();

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const TOPIC_NAME = process.env.TOPIC_NAME || "raw_events";

/*
|--------------------------------------------------------------------------
| GET /webhook
|--------------------------------------------------------------------------
*/

router.get("/", (req, res) => {
  console.log("🔥 FACEBOOK VERIFY REQUEST");

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log({
    mode,
    token,
    challenge,
  });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WEBHOOK VERIFIED");

    return res.status(200).send(challenge);
  }

  console.log("❌ VERIFY FAILED");

  return res.sendStatus(403);
});

/*
|--------------------------------------------------------------------------
| POST /webhook
|--------------------------------------------------------------------------
*/

router.post("/", async (req, res) => {
  console.log("🔥 POST /webhook HIT");

  try {
    const body = req.body || {};

    console.log("📦 RAW BODY:");
    console.log(JSON.stringify(body, null, 2));

    // Facebook page event
    if (body.object !== "page") {
      console.log("⚠️ Not a page event");

      return res.status(200).send("IGNORED");
    }

    for (const entry of body.entry || []) {
      console.log("📥 ENTRY RECEIVED");

      let normalizedEvents = [];

      try {
        normalizedEvents = normalizeFacebookEvent(entry) || [];
      } catch (err) {
        console.error("❌ Normalize Error:");
        console.error(err);

        continue;
      }

      console.log(`✅ Normalized events: ${normalizedEvents.length}`);

      for (const event of normalizedEvents) {
        try {
          console.log("📤 Sending to Kafka:");
          console.log(JSON.stringify(event, null, 2));

          await sendEvent(TOPIC_NAME, event);

          console.log("✅ Kafka send success");
        } catch (err) {
          console.error("❌ Kafka Send Error:");
          console.error(err);
        }
      }
    }

    return res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("❌ WEBHOOK ERROR:");
    console.error(error);

    return res.sendStatus(500);
  }
});

module.exports = router;

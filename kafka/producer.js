const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "facebook-webhook-app",
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
});

const producer = kafka.producer();

let isConnected = false;

// CONNECT PRODUCER
const connectProducer = async () => {
  try {
    if (!isConnected) {
      console.log("⏳ Connecting Kafka Producer...");

      await producer.connect();

      isConnected = true;

      console.log("✅ Kafka Producer connected");
    }
  } catch (error) {
    console.error("❌ Kafka connect failed:");
    console.error(error);
  }
};

// SEND EVENT
const sendEvent = async (topic, data) => {
  try {
    // reconnect nếu mất kết nối
    if (!isConnected) {
      await connectProducer();
    }

    console.log("📤 PRODUCER SEND START");

    await producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(data),
        },
      ],
    });

    console.log("✅ Kafka send success");
  } catch (error) {
    console.error("❌ PRODUCER SEND ERROR");
    console.error(error);

    isConnected = false;
  }
};

module.exports = {
  connectProducer,
  sendEvent,
};

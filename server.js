require("dotenv").config();

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger/swagger.json");

const pageRoutes = require("./routes/pageRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const { connectProducer } = require("./kafka/producer");

const app = express();
const PORT = process.env.PORT || 3001;

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

// LOG mọi request
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// Parse JSON
app.use(express.json());

// Parse form-urlencoded
app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use("/api/page", pageRoutes);

app.use("/webhook", webhookRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const startServer = async () => {
  try {
    await connectProducer();

    console.log("✅ Kafka Producer connected");

    app.listen(PORT, () => {
      console.log("======================================");
      console.log(`🚀 Server running at: http://localhost:${PORT}`);
      console.log(`📘 Swagger Docs: http://localhost:${PORT}/api-docs`);
      console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
      console.log(`🧵 Kafka Topic: ${process.env.TOPIC_NAME || "raw_events"}`);
      console.log("======================================");
    });
  } catch (error) {
    console.error("❌ Server startup failed:");
    console.error(error);

    process.exit(1);
  }
};

startServer();

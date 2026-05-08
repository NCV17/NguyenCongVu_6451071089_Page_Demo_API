// kafka/consumer.js

const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
    clientId: 'fb-consumer-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:29092']
});

const consumer = kafka.consumer({
    groupId: 'fb-group'
});

const TOPIC_NAME = process.env.TOPIC_NAME || 'raw_events';

const runConsumer = async () => {
    try {
        console.log('Starting Kafka Consumer...');

        await consumer.connect();
        console.log('Kafka Consumer connected');

        await consumer.subscribe({
            topic: TOPIC_NAME,
            fromBeginning: true
        });

        console.log(`Subscribed to topic: ${TOPIC_NAME}`);

        await consumer.run({
            eachMessage: async ({
                topic,
                partition,
                message
            }) => {
                try {
                    const rawMessage = message.value.toString();

                    console.log('\n===================================');
                    console.log('Kafka message consumed');
                    console.log(`Topic: ${topic}`);
                    console.log(`Partition: ${partition}`);
                    console.log(`Offset: ${message.offset}`);
                    console.log('Raw Payload:');
                    console.log(rawMessage);

                    const parsedEvent = JSON.parse(rawMessage);

                    console.log('\nParsed JSON Payload:');
                    console.log(
                        JSON.stringify(parsedEvent, null, 2)
                    );
                    console.log('===================================\n');

                    // TODO:
                    // xử lý tiếp:
                    // - lưu DB
                    // - gửi notification
                    // - analytics
                    // - forwarding service

                } catch (parseError) {
                    console.error(
                        'Consumer Parse Error:',
                        parseError
                    );
                }
            }
        });

    } catch (error) {
        console.error(
            'Kafka Consumer Fatal Error:',
            error
        );
    }
};


// chạy trực tiếp file này
if (require.main === module) {
    runConsumer();
}

module.exports = {
    runConsumer
};
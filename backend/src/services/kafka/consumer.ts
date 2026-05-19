import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import logger from '../../utils/logger';

class KafkaConsumerService {
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'finai-backend',
      brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
    });

    this.consumer = this.kafka.consumer({ groupId: 'finai-backend-group' });
  }

  public async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.consumer.connect();
        
        // Subscribe to relevant topics
        await this.consumer.subscribe({ topic: 'finai.expenses', fromBeginning: false });
        await this.consumer.subscribe({ topic: 'finai.payroll', fromBeginning: false });
        
        this.isConnected = true;
        logger.info('Kafka Consumer connected and subscribed');
        
        this.startProcessing();
      }
    } catch (error) {
      logger.error('Failed to connect Kafka Consumer', { error });
    }
  }

  private async startProcessing(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        const key = message.key?.toString();
        const value = message.value?.toString();
        
        if (!value) return;

        try {
          const event = JSON.parse(value);
          logger.info(`Received Event [${topic}]: ${key}`, { eventId: event.eventId });
          
          // Dispatch to appropriate handlers based on key
          switch (key) {
            case 'ExpenseCreated':
              // Logic to handle async side effects of expense creation
              // (e.g., updating materialized views, triggering AI categorization if not done via BullMQ)
              break;
            case 'PayrollProcessed':
              // Logic for post-payroll tasks (e.g., dispatching emails, notifying banking gateway)
              break;
            default:
              logger.debug(`No handler for event: ${key}`);
          }
        } catch (error) {
          logger.error(`Error processing Kafka message on topic ${topic}`, { error });
        }
      },
    });
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.consumer.disconnect();
      this.isConnected = false;
      logger.info('Kafka Consumer disconnected');
    }
  }
}

export const kafkaConsumer = new KafkaConsumerService();

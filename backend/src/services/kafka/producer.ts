import { Kafka, Producer, Partitioners } from 'kafkajs';
import logger from '../../utils/logger';

class KafkaProducerService {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'finai-backend',
      brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner
    });
  }

  public async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.producer.connect();
        this.isConnected = true;
        logger.info('Kafka Producer connected successfully');
      }
    } catch (error) {
      logger.error('Failed to connect Kafka Producer', { error });
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('Kafka Producer disconnected');
    }
  }

  public async publishEvent(topic: string, eventName: string, data: any): Promise<void> {
    if (!this.isConnected) {
      logger.warn(`Cannot publish event ${eventName} to topic ${topic} - Kafka not connected`);
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: eventName,
            value: JSON.stringify({
              eventId: require('crypto').randomUUID(),
              timestamp: new Date().toISOString(),
              eventName,
              data
            })
          }
        ]
      });
      logger.info(`Successfully published event: ${eventName} to topic: ${topic}`);
    } catch (error) {
      logger.error(`Error publishing event ${eventName} to ${topic}`, { error });
    }
  }
}

// Singleton instance
export const kafkaProducer = new KafkaProducerService();

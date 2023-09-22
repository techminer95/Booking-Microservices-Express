import * as amqp from 'amqplib';
import asyncRetry from 'async-retry';
import Logger from '../logging/logger';
import config from '../config/config';
import { injectable, singleton } from 'tsyringe';

export interface IRabbitMQConnection {
  createConnection(): Promise<amqp.Connection>;

  getChannel(): Promise<amqp.Channel>;

  closeChanel(): Promise<void>;

  closeConnection(): Promise<void>;
}

@singleton()
export class RabbitMQConnection implements IRabbitMQConnection {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  async createConnection(): Promise<amqp.Connection> {
    if (!this.connection || !this.connection == undefined) {
      try {
        await asyncRetry(
          async () => {
            this.connection = await amqp.connect(
              `amqp://${config.rabbitmq.host}:${config.rabbitmq.port}`,
              {
                username: config.rabbitmq.userName,
                password: config.rabbitmq.password
              }
            );

            Logger.info('RabbitMq connection created successfully');
          },
          {
            retries: config.retry.count,
            factor: config.retry.factor,
            minTimeout: config.retry.minTimeout,
            maxTimeout: config.retry.maxTimeout
          }
        );
      } catch (error) {
        Logger.error('RabbitMq connection failed!');
      }
    }
    return this.connection;
  }

  async getChannel(): Promise<amqp.Channel> {
    try {
      if (!this.connection) {
        await this.createConnection();
      }

      if ((this.connection && !this.channel) || !this.channel) {
        await asyncRetry(
          async () => {
            this.channel = await this.connection.createChannel();
            Logger.info('Channel Created successfully');
          },
          {
            retries: config.retry.count,
            factor: config.retry.factor,
            minTimeout: config.retry.minTimeout,
            maxTimeout: config.retry.maxTimeout
          }
        );
      }
      return this.channel;
    } catch (error) {
      Logger.error('Failed to get channel!');
    }
  }

  async closeChanel(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        Logger.info('Channel closed successfully');
      }
    } catch (error) {
      Logger.error('Channel close failed!');
    }
  }

  async closeConnection(): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.close();
        Logger.info('Connection closed successfully');
      }
    } catch (error) {
      Logger.error('Connection close failed!');
    }
  }
}

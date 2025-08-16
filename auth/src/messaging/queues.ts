import logger from "../lib/logger";
import {
  BOOKETY_AUTH_DLQ,
  BOOKETY_CUSTOMER_AUTH_VALIDATION_TOPIC,
  BUKETY_MAX_RETRIES,
  BUKETY_MAX_TIMEOUT,
} from "../constants";
import { IUser } from "../models/User";

export const authQueue = {
  [BOOKETY_CUSTOMER_AUTH_VALIDATION_TOPIC]: async (data: Partial<IUser>) => {
    // retry mech
    for (let attempt = 0; attempt < BUKETY_MAX_RETRIES; attempt++) {
      try {
        break;
      } catch (error: any) {
        if (attempt === BUKETY_MAX_RETRIES) {
          logger.error(`${[BOOKETY_CUSTOMER_AUTH_VALIDATION_TOPIC]} error`, {
            message: error.message,
            stack: error.stack,
          });
          break;
        }
        const delay = Math.pow(2, attempt) * BUKETY_MAX_TIMEOUT;
        const jitter = Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      }
      logger.warn(
        `${[BOOKETY_CUSTOMER_AUTH_VALIDATION_TOPIC]} retries has elasped`
      );
    }
  },
  [BOOKETY_AUTH_DLQ]: async (data: Partial<IUser>) => {
    // retry mech
    for (let attempt = 0; attempt < BUKETY_MAX_RETRIES; attempt++) {
      try {
        break;
      } catch (error: any) {
        if (attempt === BUKETY_MAX_RETRIES) {
          logger.error(`${[BOOKETY_CUSTOMER_AUTH_VALIDATION_TOPIC]} error`, {
            message: error.message,
            stack: error.stack,
          });
          break;
        }
        const delay = Math.pow(2, attempt) * BUKETY_MAX_TIMEOUT;
        const jitter = Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      }
    }
    logger.warn(`${[BOOKETY_AUTH_DLQ]} retries has elasped`);
  },
};

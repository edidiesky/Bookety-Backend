import { authenticator } from "otplib";
import logger from "./logger";
import redisClient from "../config/redis";
import { Response } from "express";
import jwt from "jsonwebtoken";

// Lazy-loaded nanoid with type safety
let nanoid: (size?: number) => string;

const ALPHANUMERIC_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Initializing Nanoid
 */
const initializeNanoid = async () => {
  try {
    const { customAlphabet } = await import("nanoid");
    nanoid = customAlphabet(ALPHANUMERIC_ALPHABET, 32);
  } catch (error) {
    logger.error("Failed to load nanoid module", { error });
    throw new Error("Unable to initialize token generator");
  }
};

/**
 * Get Nanoid
 */
export const getNanoid = async (): Promise<(size?: number) => string> => {
  if (!nanoid) {
    await initializeNanoid();
  }
  return nanoid;
};

/**
 * @description Gen secure token of different type
 * @param userId
 * @param type
 * @returns
 */
export const generateSecureToken = async (
  userId?: string,
  type: "reset" | "2fa" | "refresh" = "reset"
): Promise<string> => {
  const nanoid = await getNanoid();
  try {
    const token =
      type === "2fa"
        ? authenticator.generate(process.env.SECRET_2FA_KEY!)
        : nanoid(6);
    // CREATE EXPIRATION
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    if (type === "reset") {
      await redisClient.set(
        `reset:token:${token}`,
        JSON.stringify({
          token,
          expiresAt: now,
          userId,
        }),
        "EX",
        2 * 60
      );
    }
    if (type === "refresh") {
      return nanoid(32);
    }
    logger.info("Token and expiration value:", { token, now });
    return token as string;
  } catch (error: any) {
    logger.error("Failed to generate Token:", error);
    throw new Error(`Failed to generate ${type} Token`);
  }
};

/**
 * @description It also helps me to generate Access token for auth
 * @param name
 * @param role
 * @param userId
 * @returns
 */
export const singJWT = async (
  name: string,
  role: string,
  userId: string
): Promise<string> => {
  try {
    return jwt.sign({ name, role, userId }, process.env.JWT_CODE!, {
      expiresIn: "7d",
    });
  } catch (error) {
    logger.error("Failed to generate Access token. Please you can try again!");
    throw new Error(
      "Failed to generate Access token. Please you can try again!"
    );
  }
};

/**
 * @description It helps me to generate Refresh and Access token
 * @param res
 * @param name
 * @param role
 * @param userId
 */
export const generateAuthTokens = async (
  res: Response,
  name: string,
  role: string,
  userId: string
): Promise<{ accessToken: string; refreshtoken: string }> => {
  try {
    const accessToken = await singJWT(name, role, userId);
    const refreshtoken = await generateSecureToken(userId, "refresh");

    // PERSIST REFRESH TOKEN
    try {
      await redisClient.set(
        `refreshtoken:${userId}`,
        JSON.stringify(refreshtoken),
        "EX",
        7 * 24 * 60 * 60
      );
      logger.error("Successfully generated refresh token.");
    } catch (error) {
      logger.error("Failed to persist refresh token.");
    }

    return {
      accessToken,
      refreshtoken,
    };
  } catch (error) {
    logger.error(
      "Failed to generate Authentication token. Please you can try again!"
    );
    throw new Error(
      "Failed to generate Authentication token. Please you can try again!"
    );
  }
};

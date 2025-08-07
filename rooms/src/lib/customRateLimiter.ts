import rateLimit from "express-rate-limit";
import logger from "./logger";
import { Request, Response, NextFunction } from "express";

const createLimiter = (max: number, windowMs: number, prefix: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: async (req: Request, res: Response) => {
      const remainingMs =
        Number(res.getHeader("X-RateLimit-Reset")) * 1000 - Date.now();
      const retryAfterSeconds = Math.ceil(remainingMs / 1000);
      return {
        status: "error",
        error: `You have exceeded the limit of ${max} requests within a ${Math.floor(
          windowMs / 60000
        )}-minute period. Please wait ${retryAfterSeconds} seconds before trying again.`,
        retryAfter: retryAfterSeconds,
      };
    },
    handler: (req: Request, res: Response, next: NextFunction, options) => {
      logger.warn("Rate limit exceeded", {
        ip: req.ip,
        path: req.path,
        prefix,
      });
      const remainingMs =
        Number(res.getHeader("X-RateLimit-Reset")) * 1000 - Date.now();
      const retryAfterSeconds = Math.ceil(remainingMs / 1000);
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      res.status(options.statusCode).json(options.message);
    },
    skip: (req) => req.url === "/health" || req.url === "/metrics",
  });

export default createLimiter;

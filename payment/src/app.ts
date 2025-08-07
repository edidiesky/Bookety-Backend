import helmet from "helmet";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import { setupSwagger } from "./swagger";
import cookieParser from "cookie-parser";
import { errorHandler, NotFound } from "./middleware/error-handler";
import { userRegistry } from "./lib/metrics";
import logger from "./lib/logger";

const app = express();

//app.use(cors());
if (!process.env.WEB_ORIGIN) {
  throw new Error("No WEB_ORIGIN");
}

app.use(helmet());

app.use(
  cors({
    origin: [process.env.WEB_ORIGIN!],
    credentials: true,
  })
);

/** LOGS REQUEST */
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/** ROUTES */
/** HEALTH CHECK */
app.get("/health", (_req, res) => {
  res.json({ status: "Ok" });
});

app.use("/api/v1/auth", authRoutes);
setupSwagger(app);

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", userRegistry.contentType);
    res.end(await userRegistry.metrics());
    logger.info("User Metrics has been scraped successfully!");
  } catch (error) {
    logger.error("User Metrics scraping error:", {
      error,
    });
  }
});

app.use(errorHandler);
app.use(NotFound);
export { app };

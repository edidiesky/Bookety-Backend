import User from "../models/User";
import {
  BAD_REQUEST_STATUS_CODE,
  BOOKETY_AUTH_2FA_NOTIFICATION_TOPIC,
  BOOKETY_AUTH_RESET_PASSWORD_TOKEN_NOTIFICATION_TOPIC,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import bcrypt from "bcryptjs";
import logger from "../lib/logger";
import { AuthService } from "../services/auth.service";
import { Response, Request } from "express";
import { generateSecureToken } from "../lib/generateToken";
import { AuthProducer } from "../messaging/producer";
import redisClient from "../config/redis";
import mongoose from "mongoose";
/**
 * MY AUTH THOUGHT FLOWS.
 * REGISTRATION: EMAIL -> PASSWORD -> PHONE -> CREATE TOKENS -> DASHBOARD
 * LOGIN: EMAIL -> PASSWORD -> 2FA -> MAIL -> CONFIRM 2FA
 * 2FA: USERID, TOKEN -> VERIFY USER -> CHECK FOR TOKEN VALIDITY (EXPIRATION) -> DELETE OLD TOKEN -> GENERATE REFRESH AND ACCESS TOKEN
 * RESET TOKEN: TOKEN -> CHECK FOR EXPIRATION -> CREATE NEW JWT AND COOKIE (ACCESS TOKEN CONTAINS CLAIMS) -> CREATE NEW REFRESH TOKEN -> DELETE OLD REFRESH TOKEN
 * REQUEST PASSWORD RESET: EMAIL -> FIND THE USER -> GENERATE A TOKEN AND SEND TO MAIL WITH EXPIRATION -> MAIL -> CONFIRM 2FA
 * RESET PASSWORD RESET: TOKEN , USERID -> CHECK FOR TOKEN VALIDITY (EXPIRATION) -> GET THE SINGLE USER -> CHANGE THE PASSWORD
 * - > CHECK FOR USER -> GET SALT -> HASH NEW PASSWORD WITH SALT -> SAVE THE NEW PASSWORD ON THE USER'S PASSWORD ROW -> DELTE THE TOKEN
 */

export class AuthController {
  private authService: typeof AuthService;
  private authProducer: AuthProducer;
  constructor() {
    this.authService = AuthService;
    this.authProducer = new AuthProducer();
  }
  async registerHandler(req: Request, res: Response) {
    try {
      const { email } = req.body;
    } catch (error: any) {
      logger.error("Registration Error", error);
      res.status(BAD_REQUEST_STATUS_CODE).json({
        message:
          "An error did occurred during the registration process. Please try again!",
        status: "error",
        data: null,
      });
    }
  }
  async loginHandler(req: Request, res: Response) {
    // Send 2fa
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select("email _id password");
      if (!user) {
        logger.error("Unidentified User", {
          email,
          ip:
            req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.ip,
        });
        res.status(BAD_REQUEST_STATUS_CODE).json({
          message:
            "You do not have any record with us. Please try again by providing the right information!",
          status: "error",
          data: null,
        });
      }

      // Verify the password
      const isValidPassword = await bcrypt.compare(password, user?.password!);
      if (!isValidPassword) {
        logger.error("Wrong Password:", {
          email,
          password,
          ip:
            req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.ip,
        });
        res.status(BAD_REQUEST_STATUS_CODE).json({
          message:
            "You provided a wrong password. Please try again by providing the right password information!",
          status: "error",
          data: null,
        });
      }

      // SEND TOKEN FOR 2FA
      const token = await generateSecureToken(user?._id, "2fa");
      // send the data to notification exchange
      const message = {
        type: "password_reset",
        payload: {
          userId: user?._id,
          email: user?.email,
          token,
          expiresAt: new Date(Date.now() + 2 * 60 * 1000),
        },
        timestamp: Date.now(),
      };
      await this.authProducer.sendMessage(
        BOOKETY_AUTH_2FA_NOTIFICATION_TOPIC,
        message
      );

      res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
        status: "success",
        data: {
          userId: user?._id,
        },
        message:
          "Login 2FA token has been sent to your email. You can proceed further by visiting your mail and using the token for further verification.",
      });
    } catch (error: any) {
      logger.error("Login Request Error", {
        message: error.message,
        stack: error.stack,
      });
      res.status(BAD_REQUEST_STATUS_CODE).json({
        message:
          "An error did occurred during the Login request process. Please try again!",
        status: "error",
        data: null,
      });
    }
  }
  async twoFAHandler(req: Request, res: Response) {}

  /**
   * @description LOGOUT USER HANDLER
   */
  async resetTokenHandler(req: Request, res: Response) {
    try {
    } catch (error: any) {
      logger.error("Reset Token Request Error", {
        message: error.message,
        stack: error.stack,
      });
      res.status(BAD_REQUEST_STATUS_CODE).json({
        message:
          "An error did occurred during the Token Reset Request process. Please try again!",
        status: "error",
        data: null,
      });
    }
  }

  /**
   * @description LOGOUT USER HANDLER
   */
  async logoutHandler(req: Request, res: Response) {
    res.cookie("jwt", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || false,
    });
    logger.info("User has been logged out succesfully!!");
    res.status(200).json({ message: "Logged out succesfully!!" });
  }
  /**
   * @description REQUEST PASSWORD RESET HANDLER
   */
  async requestPasswordResetHandler(req: Request, res: Response) {
    try {
      const { email } = req.body;
      // FIND THE USER
      const user = await User.findOne({ email }).select("email _id");
      if (!user) {
        logger.error("Unidentified User", {
          email,
          ip:
            req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.ip,
        });
        res.status(BAD_REQUEST_STATUS_CODE).json({
          message:
            "You do not have any record with us. Please try again by providing the right information!",
          status: "error",
          data: null,
        });
      }

      // generate a token
      const token = await generateSecureToken(user?._id, "reset");
      // send the data to notification exchange
      const message = {
        type: "password_reset",
        payload: {
          userId: user?._id,
          email: user?.email,
          token,
          expiresAt: new Date(Date.now() + 2 * 60 * 1000),
        },
        timestamp: Date.now(),
      };
      await this.authProducer.sendMessage(
        BOOKETY_AUTH_RESET_PASSWORD_TOKEN_NOTIFICATION_TOPIC,
        message
      );

      return res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
        message: "Password reset email sent successfully",
        status: "success",
        data: null,
      });
    } catch (error: any) {
      logger.error("Password Reset Request Error", {
        message: error.message,
        stack: error.stack,
      });
      res.status(BAD_REQUEST_STATUS_CODE).json({
        message:
          "An error did occurred during the Password Reset Request process. Please try again!",
        status: "error",
        data: null,
      });
    }
  }
  /**
   * @description FORGET PASSWORD HANDLER
   */
  async forgetPasswordHandler(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { password, token } = req.body;
      const now = new Date();
      // FIND THE TOKEN
      const cachedToken = await redisClient.get(`reset:token:${token}`);
      if (!cachedToken) {
        logger.error("The cached token does not exists in the cache:");
        return res.status(BAD_REQUEST_STATUS_CODE).json({
          message:
            "The token provided does not exists. Please review the token been sent and retry requesting for a new token",
          status: "error",
          data: null,
        });
      }
      const { expiresAt, userId } = JSON.parse(cachedToken!);
      // CHECK IF IT HAS EXPIRED
      if (expiresAt < now) {
        logger.error("The cached token has expired:");
        return res.status(BAD_REQUEST_STATUS_CODE).json({
          message:
            "The token provided has already expired. Please review the token been sent and retry requesting for a new token",
          status: "error",
          data: null,
        });
      }
      if (!(await User.findOne({ _id: userId }).session(session))) {
        logger.error("The user does not exists:");
        return res.status(BAD_REQUEST_STATUS_CODE).json({
          message:
            "It seems you do not have any record with us. Please try to create an account record with us for you to access this feature.",
          status: "error",
          data: null,
        });
      }
      // CHANGE THE PASSWORD
      const salt = await bcrypt.genSalt(10);
      const newPassword = await bcrypt.hash(password, salt);
      // PERSIST THE CHANGE

      // RETURN THE USER.
      const updatedUserRecord = await User.findOneAndUpdate(
        { _id: userId },
        {
          password: newPassword,
        },
        { new: true, session }
      ).select("email _id image role firstname lastname");

      res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
        message: "Password reset email sent successfully",
        status: "success",
        data: updatedUserRecord,
      });
      session.commitTransaction();
      session.endSession();
    } catch (error: any) {
      logger.error("Password Reset Request Error", {
        message: error.message,
        stack: error.stack,
      });
      res.status(BAD_REQUEST_STATUS_CODE).json({
        message:
          "An error did occurred during the Password Reset Request process. Please try again!",
        status: "error",
        data: null,
      });
      session.abortTransaction();
      session.endSession();
    }
  }
}

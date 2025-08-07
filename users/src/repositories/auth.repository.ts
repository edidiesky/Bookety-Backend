import { BAD_REQUEST_STATUS_CODE } from "../constants";
import logger from "../lib/logger";
import { AuthService } from "../services/auth.service";
import { Response, Request } from "express";

export class AuthController {
  private authService;
  constructor() {
    this.authService = AuthService;
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
  async loginHandler() {}
  async twoFAHandler() {}
  async resetTokenHandler() {}
  async logoutHandler() {}
  async requestPasswordResetHandler() {}
  async forgetPasswordHandler() {}
}

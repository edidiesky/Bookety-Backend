import logger from "../lib/logger";
import { Response, Request } from "express";

export class AuthService {
  constructor() {}
  async getSingleUserService(req: Request, res: Response) {
    try {
      
    } catch (error: any) {
      logger.error("", error);
    }
  }
  async getAllUserService(req: Request, res: Response) {
    try {
    } catch (error: any) {
      logger.error("", error);
    }
  }
}

import { JwtPayload } from "jsonwebtoken";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: string;
        role: string;
        name: string;
        mdaRole: string;
        payeRole: string;
        assessmentRole: string;
    };
  }
}

import mongoose, { Document, Schema } from "mongoose";

enum UserRole {
  HOST = "HOST",
  GUEST = "GUEST",
  ADMIN = "ADMIN",
  SUPERADMIN = "SUPERADMIN",
}

export interface IUser extends Document {
  password: string;
  email: string;
  firstname: string;
  lastname: string;
  isVerified: boolean;
  lastLogin: Date;
  address: string;
  role: UserRole;
  isCompliant: boolean;
  phone: string;
  image: string;
  username: string;
  _id: string;
}

const userSchema = new Schema<IUser>(
  {
    firstname: { type: String },
    email: { type: String, required: true },
    password: { type: String },
    lastname: { type: String },
    isVerified: { type: Boolean, default: false },
    isCompliant: { type: Boolean, default: false },
    address: { type: String },
    phone: { type: String },
    image: { type: String },
    username: { type: String },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.GUEST,
    },
  },
  { timestamps: true }
);

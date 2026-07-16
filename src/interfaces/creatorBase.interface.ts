import { IUser } from "./user.interface";

export interface CreatorBase {
  createdBy?: string | IUser;
  updatedBy?: string | IUser;
  createdAt?: Date;
  updatedAt?: Date;
}

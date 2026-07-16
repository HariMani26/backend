
import { customAlphabet } from "nanoid";

export const toBoolean = (val: string) => {
  return val === "true";
};

export const getNanoId = () => {
  return customAlphabet("0123456789", 14)();
};

export const generateUniqueTransactionCode = () => {
  const customDigits = `0${new Date().getTime()}`;
  return customAlphabet(customDigits, 14)().toString();
};

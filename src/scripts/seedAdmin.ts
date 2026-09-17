/* eslint-disable no-console */

import {
  ADMIN_SEED_EMAIL,
  ADMIN_SEED_MOBILE,
  ADMIN_SEED_PASSWORD,
} from "@/config";
import { UserModel } from "@models/User.model";
import { hashSecret } from "@utils/password";

async function run(): Promise<void> {
  if (!ADMIN_SEED_EMAIL || !ADMIN_SEED_PASSWORD || !ADMIN_SEED_MOBILE) {
    console.log(
      "ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD / ADMIN_SEED_MOBILE not set — skipping admin seed.",
    );
    return;
  }

  try {
    const passwordHash = await hashSecret(ADMIN_SEED_PASSWORD);
    await UserModel.findOneAndUpdate(
      { email: ADMIN_SEED_EMAIL.toLowerCase() },
      {
        $set: {
          email: ADMIN_SEED_EMAIL.toLowerCase(),
          mobile: ADMIN_SEED_MOBILE,
          countryCode: "+91",
          passwordHash,
          role: "superAdmin",
          isActive: true,
          isPhoneVerified: true,
        },
      },
      { upsert: true },
    );
    console.log(`✅ Super-admin account ready for ${ADMIN_SEED_EMAIL}`);
  } catch (err) {
    console.error("Admin seed failed", err);
    throw err;
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Admin seed failed", err);
    process.exit(1);
  });

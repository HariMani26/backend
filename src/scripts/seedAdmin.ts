/* eslint-disable no-console */

import { env } from "@config/env";
import { UserModel } from "@models/User.model";
import { hashSecret } from "@utils/password";

async function run(): Promise<void> {
  if (
    !env.ADMIN_SEED_EMAIL ||
    !env.ADMIN_SEED_PASSWORD ||
    !env.ADMIN_SEED_MOBILE
  ) {
    console.log(
      "ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD / ADMIN_SEED_MOBILE not set — skipping admin seed.",
    );
    return;
  }

  try {
    const passwordHash = await hashSecret(env.ADMIN_SEED_PASSWORD);
    await UserModel.findOneAndUpdate(
      { email: env.ADMIN_SEED_EMAIL.toLowerCase() },
      {
        $set: {
          email: env.ADMIN_SEED_EMAIL.toLowerCase(),
          mobile: env.ADMIN_SEED_MOBILE,
          countryCode: "+91",
          passwordHash,
          role: "superAdmin",
          isActive: true,
          isPhoneVerified: true,
        },
      },
      { upsert: true },
    );
    console.log(`✅ Super-admin account ready for ${env.ADMIN_SEED_EMAIL}`);
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

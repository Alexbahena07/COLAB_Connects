-- Email verification is now enforced at login. Grandfather every account that
-- existed before this deploy so they aren't locked out; only accounts created
-- after this migration must verify.
UPDATE "User" SET "emailVerified" = NOW() WHERE "emailVerified" IS NULL;

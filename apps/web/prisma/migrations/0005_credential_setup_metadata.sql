ALTER TABLE "CredentialSetup" ADD COLUMN IF NOT EXISTS "credentialType" text NOT NULL DEFAULT 'custom_ref';
ALTER TABLE "CredentialSetup" ADD COLUMN IF NOT EXISTS "allowedUse" text NOT NULL DEFAULT '';
ALTER TABLE "CredentialSetup" ADD COLUMN IF NOT EXISTS "redactedValue" text NOT NULL DEFAULT '••••';
ALTER TABLE "CredentialSetup" ADD COLUMN IF NOT EXISTS "secretCiphertext" text;
ALTER TABLE "CredentialSetup" ADD COLUMN IF NOT EXISTS "valueFingerprint" text;

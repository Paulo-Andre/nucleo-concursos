// Never inherit production database or provider credentials during the build.
process.env.DATABASE_URL = "";
process.env.ROOT_INITIAL_PASSWORD = "unit-test-password-only";
process.env.JWT_SECRET = "unit-test-secret-not-for-production-0000";
process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-unit-only";
process.env.MERCADO_PAGO_WEBHOOK_SECRET = "unit-webhook-secret-only";
process.env.RESEND_API_KEY = "";
process.env.RESEND_FROM_EMAIL = "";
process.env.BUILT_IN_FORGE_API_URL = "";
process.env.BUILT_IN_FORGE_API_KEY = "";
process.env.OWNER_OPEN_ID = "";
process.env.OAUTH_SERVER_URL = "";
process.env.PUBLIC_APP_URL = "https://example.invalid";
globalThis.fetch = async () => { throw new Error("Use um mock: rede indisponível nos testes unitários."); };

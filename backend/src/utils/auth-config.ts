const DEVELOPMENT_JWT_SECRET = 'development-only-change-me';

export function getJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) {
    if (configuredSecret.length < 32 && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must contain at least 32 characters in production.');
    }
    return configuredSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }
  return DEVELOPMENT_JWT_SECRET;
}

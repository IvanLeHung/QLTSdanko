const DEVELOPMENT_JWT_SECRET = 'development-only-change-me';

export function getJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) {
    if (configuredSecret.length < 32 && process.env.NODE_ENV === 'production') {
      // Keep existing deployments available while clearly flagging that the
      // secret should be rotated. Render may already have provisioned a
      // shorter secret before this validation was introduced.
      console.warn('JWT_SECRET is shorter than the recommended 32 characters. Rotate it when possible.');
    }
    return configuredSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }
  return DEVELOPMENT_JWT_SECRET;
}

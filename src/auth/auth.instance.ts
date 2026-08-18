import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins/bearer';
import { organization } from 'better-auth/plugins/organization';
import { genericOAuth } from 'better-auth/plugins/generic-oauth';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { ConfigService } from '@nestjs/config';

export function createAuthInstance(db: NodePgDatabase<any>, config: ConfigService) {
  const plugins: BetterAuthOptions['plugins'] = [bearer()];

  if (config.get<boolean>('auth.sso.enabled')) {
    plugins!.push(
      organization(),
      genericOAuth({
        config: [
          {
            providerId: 'enterprise-sso',
            clientId: config.get<string>('auth.sso.clientId')!,
            clientSecret: config.get<string>('auth.sso.clientSecret'),
            discoveryUrl: config.get<string>('auth.sso.discoveryUrl'),
            scopes: ['openid', 'profile', 'email'],
            pkce: true,
          },
        ],
      }),
    );
  }

  return betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    secret: config.get<string>('auth.secret'),
    baseURL: config.get<string>('auth.baseURL'),
    basePath: config.get<string>('auth.basePath'),
    trustedOrigins: [config.get<string>('auth.baseURL')!],
    emailAndPassword: { enabled: true },
    plugins,
  });
}

export type AuthInstance = ReturnType<typeof createAuthInstance>;

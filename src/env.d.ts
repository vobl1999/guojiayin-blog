/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />
import type { DBEnv } from './lib/db';
import type { SessionUser } from './lib/session';

declare global {
  namespace App {
    interface Locals {
      runtime: { env: DBEnv };
      user: SessionUser | null;
    }
  }
}

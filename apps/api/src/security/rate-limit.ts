export type AuthRateScope = 'login' | 'forgot' | 'reset';

type LimitRule = {
  ip: number;
  email: number;
  windowMs: number;
};

export const AUTH_RATE_LIMITS: Record<AuthRateScope, LimitRule> = {
  login: { ip: 10, email: 10, windowMs: 15 * 60 * 1000 },
  forgot: { ip: 5, email: 5, windowMs: 15 * 60 * 1000 },
  reset: { ip: 5, email: 0, windowMs: 15 * 60 * 1000 }
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type Bucket = number[];

const prune = (timestamps: Bucket, windowStart: number) => timestamps.filter((ts) => ts > windowStart);

export function createAuthRateLimiter(now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();

  const inspect = (key: string, limit: number, windowMs: number, current: number) => {
    const prev = prune(buckets.get(key) ?? [], current - windowMs);
    if (prev.length >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((prev[0] + windowMs - current) / 1000));
      return { allowed: false, retryAfterSeconds, prev };
    }
    return { allowed: true, retryAfterSeconds: 0, prev };
  };

  return {
    consume(input: { scope: AuthRateScope; ip: string; email?: string }): RateLimitResult {
      const rule = AUTH_RATE_LIMITS[input.scope];
      const current = now();
      const checks: Array<{ key: string; prev: Bucket }> = [];

      const ipKey = `${input.scope}:ip:${input.ip || 'unknown'}`;
      const ipCheck = inspect(ipKey, rule.ip, rule.windowMs, current);
      if (!ipCheck.allowed) {
        buckets.set(ipKey, ipCheck.prev);
        return { allowed: false, retryAfterSeconds: ipCheck.retryAfterSeconds };
      }
      checks.push({ key: ipKey, prev: ipCheck.prev });

      const email = input.email?.trim().toLowerCase();
      if (rule.email > 0 && email) {
        const emailKey = `${input.scope}:email:${email}`;
        const emailCheck = inspect(emailKey, rule.email, rule.windowMs, current);
        if (!emailCheck.allowed) {
          buckets.set(emailKey, emailCheck.prev);
          return { allowed: false, retryAfterSeconds: emailCheck.retryAfterSeconds };
        }
        checks.push({ key: emailKey, prev: emailCheck.prev });
      }

      for (const check of checks) {
        check.prev.push(current);
        buckets.set(check.key, check.prev);
      }

      if (buckets.size > 10_000) {
        const oldest = buckets.keys().next().value;
        if (oldest) buckets.delete(oldest);
      }

      return { allowed: true, retryAfterSeconds: 0 };
    }
  };
}

export const authRateLimiter = createAuthRateLimiter();

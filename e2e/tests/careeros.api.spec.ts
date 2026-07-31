import { test, expect, APIRequestContext } from '@playwright/test';

const API = `${process.env.API_URL ?? 'http://localhost:3001'}/api`;

/** Unwrap the { success, data } envelope and assert success. */
async function unwrap<T>(res: { ok(): boolean; json(): Promise<any>; status(): number }): Promise<T> {
  const body = await res.json();
  expect(body.success, `expected success, got ${JSON.stringify(body)}`).toBeTruthy();
  return body.data as T;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

test.describe('CareerOS API — full user journey', () => {
  let ctx: APIRequestContext;
  let token: string;
  const email = `e2e_${Date.now()}@example.com`;

  test.beforeAll(async ({ playwright }) => {
    ctx = await playwright.request.newContext();
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('health endpoint is public and reports the DB', async () => {
    const res = await ctx.get(`${API}/health`);
    const data = await unwrap<{ status: string; db: string }>(res);
    expect(data.db).toBe('up');
  });

  test('registers and returns JWT tokens', async () => {
    const res = await ctx.post(`${API}/auth/register`, {
      data: { email, password: 'supersecret', fullName: 'E2E Bilel' },
    });
    const data = await unwrap<{ accessToken: string; refreshToken: string }>(res);
    expect(data.accessToken).toBeTruthy();
    token = data.accessToken;
  });

  test('returns the authenticated profile', async () => {
    const res = await ctx.get(`${API}/users/me`, { headers: authHeaders(token) });
    const data = await unwrap<{ email: string }>(res);
    expect(data.email).toBe(email);
  });

  test('deduplicates skills on repeated add', async () => {
    await ctx.post(`${API}/skills`, {
      headers: authHeaders(token),
      data: { name: 'Playwright', category: 'framework' },
    });
    await ctx.post(`${API}/skills`, {
      headers: authHeaders(token),
      data: { name: 'playwright', category: 'framework' }, // same, different case
    });
    const res = await ctx.get(`${API}/skills`, { headers: authHeaders(token) });
    const skills = await unwrap<{ name: string }[]>(res);
    expect(skills.filter((s) => s.name.toLowerCase() === 'playwright')).toHaveLength(1);
  });

  test('journal extraction expands GitHub Actions into implied concepts', async () => {
    const res = await ctx.post(`${API}/journal`, {
      headers: authHeaders(token),
      data: {
        rawText: 'J’ai mis en place un pipeline GitHub Actions pour automatiser les tests Playwright.',
        apply: true,
      },
    });
    const data = await unwrap<{ extraction: { skills: { name: string }[] }; addedSkills: string[] }>(res);
    const names = data.extraction.skills.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['GitHub Actions', 'CI/CD', 'YAML', 'DevOps']));
    expect(data.addedSkills.length).toBeGreaterThan(0);
  });

  test('scheduler pipeline scrapes, matches and yields offers', async () => {
    const run = await ctx.post(`${API}/scheduler/run`, { headers: authHeaders(token) });
    await unwrap(run);

    const jobsRes = await ctx.get(`${API}/jobs`, { headers: authHeaders(token) });
    const jobs = await unwrap<unknown[]>(jobsRes);
    expect(jobs.length).toBeGreaterThan(0);

    const matchesRes = await ctx.get(`${API}/matches`, { headers: authHeaders(token) });
    const matches = await unwrap<{ globalScore: number }[]>(matchesRes);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].globalScore).toBeGreaterThanOrEqual(0);
  });

  test('generates a weekly report', async () => {
    const gen = await ctx.post(`${API}/reports/generate?type=weekly`, { headers: authHeaders(token) });
    await unwrap(gen);
    const res = await ctx.get(`${API}/reports`, { headers: authHeaders(token) });
    const reports = await unwrap<unknown[]>(res);
    expect(reports.length).toBeGreaterThan(0);
  });

  test('autonomous Career Agent completes a full cycle with a digest', async () => {
    const res = await ctx.post(`${API}/agent/run`, { headers: authHeaders(token) });
    const run = await unwrap<{ status: string; digest: { narrative: string; recommendedActions: unknown[] } }>(res);
    expect(run.status).toBe('completed');
    expect(run.digest.narrative.length).toBeGreaterThan(0);
    expect(Array.isArray(run.digest.recommendedActions)).toBeTruthy();

    const digestRes = await ctx.get(`${API}/agent/digest`, { headers: authHeaders(token) });
    const digest = await unwrap<{ id: string } | null>(digestRes);
    expect(digest).not.toBeNull();
  });

  test('prepares and approves an application package', async () => {
    const jobsRes = await ctx.get(`${API}/jobs`, { headers: authHeaders(token) });
    const jobs = await unwrap<{ id: string }[]>(jobsRes);
    const offerId = jobs[0].id;

    const prep = await ctx.post(`${API}/applications/prepare`, {
      headers: authHeaders(token),
      data: { offerId },
    });
    const app = await unwrap<{ id: string; status: string; coverLetter: string }>(prep);
    expect(app.status).toBe('pending_review');
    expect(app.coverLetter.length).toBeGreaterThan(0);

    const listRes = await ctx.get(`${API}/applications`, { headers: authHeaders(token) });
    const list = await unwrap<unknown[]>(listRes);
    expect(list.length).toBeGreaterThan(0);

    // Manual channel never auto-sends: it stays "approved" (ready to send).
    const appr = await ctx.post(`${API}/applications/${app.id}/approve`, { headers: authHeaders(token) });
    const approved = await unwrap<{ status: string }>(appr);
    expect(['approved', 'submitted']).toContain(approved.status);
  });

  test('rejects unauthenticated access', async () => {
    const res = await ctx.get(`${API}/users/me`);
    expect(res.status()).toBe(401);
  });

  test('RGPD: exports then erases the account', async () => {
    const exportRes = await ctx.get(`${API}/users/me/export`, { headers: authHeaders(token) });
    const data = await unwrap<{ skills: unknown[]; passwordHash?: string }>(exportRes);
    expect(data.skills.length).toBeGreaterThan(0);
    expect(data.passwordHash).toBeUndefined(); // never exported

    const del = await ctx.delete(`${API}/users/me`, { headers: authHeaders(token) });
    await unwrap(del);

    // JWT is stateless, so the guard still passes, but the profile no longer exists.
    const after = await ctx.get(`${API}/users/me`, { headers: authHeaders(token) });
    expect(after.status()).toBe(404);
  });
});

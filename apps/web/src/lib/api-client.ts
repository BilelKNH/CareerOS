const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'careeros_token';

export function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: unknown;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const body = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !body.success) {
    throw new Error(extractError(body.error, res.status));
  }
  return body.data;
}

/** Pull a human-readable message out of the API error envelope (string,
 *  nested {message}, or validation string[]). */
export function extractError(err: unknown, status: number, fallback = 'Erreur'): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(', ');
  }
  return `${fallback} (${status})`;
}

// ---- Typed endpoints ----

export interface ExtractedSkill {
  name: string;
  category: string;
  inferred: boolean;
}
export interface Extraction {
  skills: ExtractedSkill[];
  technologies: string[];
  responsibilities: string[];
  results: string[];
  summary: string;
  method: 'llm' | 'heuristic';
}

export const endpoints = {
  login: (email: string, password: string) =>
    api<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, fullName?: string) =>
    api<{ accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    }),

  dashboard: () => api<DashboardOverview>('/dashboard'),

  skills: () => api<Skill[]>('/skills'),
  addSkill: (name: string, category?: string) =>
    api<Skill>('/skills', { method: 'POST', body: JSON.stringify({ name, category }) }),
  deleteSkill: (id: string) => api<void>(`/skills/${id}`, { method: 'DELETE' }),
  clearSkills: () => api<{ deleted: number }>('/skills', { method: 'DELETE' }),

  experiences: () => api<Experience[]>('/experiences'),
  createExperience: (input: ExperienceInput) =>
    api<Experience>('/experiences', { method: 'POST', body: JSON.stringify(input) }),
  updateExperience: (id: string, input: Partial<ExperienceInput>) =>
    api<Experience>(`/experiences/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteExperience: (id: string) =>
    api<{ deleted: boolean }>(`/experiences/${id}`, { method: 'DELETE' }),

  journal: () => api<JournalEntry[]>('/journal'),
  createJournal: (rawText: string, apply: boolean) =>
    api<{ entry: JournalEntry; extraction: Extraction; addedSkills?: string[]; employabilityScore?: number }>(
      '/journal',
      { method: 'POST', body: JSON.stringify({ rawText, apply }) },
    ),
  applyJournal: (id: string) =>
    api<{ extraction: Extraction; addedSkills: string[]; employabilityScore: number }>(
      `/journal/${id}/apply`,
      { method: 'POST' },
    ),

  jobs: () => api<JobOffer[]>('/jobs'),
  job: (id: string) => api<JobDetail>(`/jobs/${id}`),
  matches: () => api<Match[]>('/matches'),
  recomputeMatches: () => api<unknown>('/matches/recompute', { method: 'POST' }),
  runPipeline: () => api<{ newOffers: number; notifications: number }>('/scheduler/run', { method: 'POST' }),

  notifications: () => api<Notification[]>('/notifications'),
  unreadCount: () => api<number>('/notifications/unread-count'),
  markNotificationRead: (id: string) => api<unknown>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => api<{ updated: number }>('/notifications/read-all', { method: 'PATCH' }),

  adaptCv: (offerId?: string) =>
    api<CvOutput>('/ai/adapt-cv', { method: 'POST', body: JSON.stringify({ offerId }) }),
  market: () => api<MarketAnalysis>('/ai/market'),
  coach: () => api<CoachPlan>('/ai/coach'),

  reports: () => api<ReportSummary[]>('/reports'),
  report: (id: string) => api<ReportFull>(`/reports/${id}`),
  generateReport: (type: 'weekly' | 'monthly') =>
    api<ReportSummary>(`/reports/generate?type=${type}`, { method: 'POST' }),

  preferences: () => api<Preferences | null>('/users/me/preferences'),
  updatePreferences: (p: Partial<Preferences>) =>
    api<Preferences>('/users/me/preferences', { method: 'PUT', body: JSON.stringify(p) }),

  profile: () => api<Profile>('/users/me'),

  importCv: async (file: File): Promise<CvImportResult> => {
    const fd = new FormData();
    fd.append('file', file);
    const token = getAccessToken();
    const res = await fetch(`${API_URL}/api/cv/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const body = (await res.json()) as ApiEnvelope<CvImportResult>;
    if (!res.ok || !body.success) {
      throw new Error(extractError(body.error, res.status, 'Import du CV échoué'));
    }
    return body.data;
  },

  careers: () => api<CareerMatch[]>('/match/careers'),
  matchRole: (role: string, cvText?: string) =>
    api<RoleScore>('/match/role', { method: 'POST', body: JSON.stringify({ role, cvText }) }),
  matchOffer: (params: { offerId?: string; jobText?: string; cvText?: string }) =>
    api<OfferMatch>('/match/offer', { method: 'POST', body: JSON.stringify(params) }),
  matchOfferUrl: (url: string) =>
    api<OfferMatch>('/match/offer-url', { method: 'POST', body: JSON.stringify({ url }) }),

  agentRun: () => api<AgentRunRecord>('/agent/run', { method: 'POST' }),
  agentDigest: () => api<AgentRunRecord | null>('/agent/digest'),
  agentRuns: () => api<AgentRunSummary[]>('/agent/runs'),
  agentSettingsGet: () => api<{ autonomousAgentEnabled: boolean }>('/agent/settings'),
  agentSettings: (enabled: boolean) =>
    api<{ autonomousAgentEnabled: boolean }>('/agent/settings', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),

  sources: () => api<{ source: string; enabled: boolean }[]>('/scraping/sources'),

  applications: () => api<Application[]>('/applications'),
  prepareApplication: (offerId: string) =>
    api<Application>('/applications/prepare', { method: 'POST', body: JSON.stringify({ offerId }) }),
  approveApplication: (id: string) => api<Application>(`/applications/${id}/approve`, { method: 'POST' }),
  skipApplication: (id: string) => api<Application>(`/applications/${id}/skip`, { method: 'POST' }),
  rejectApplication: (id: string) => api<Application>(`/applications/${id}/reject`, { method: 'POST' }),
  followUpApplication: (id: string) => api<Application>(`/applications/${id}/followup`, { method: 'POST' }),
  interviewApplication: (id: string, interviewAt?: string) =>
    api<Application>(`/applications/${id}/interview`, { method: 'POST', body: JSON.stringify({ interviewAt }) }),
  offerApplication: (id: string) => api<Application>(`/applications/${id}/offer`, { method: 'POST' }),
  autoApplySettings: () => api<AutoApplySettings>('/applications/settings'),
  updateAutoApplySettings: (s: Partial<AutoApplySettings>) =>
    api<AutoApplySettings>('/applications/settings', { method: 'POST', body: JSON.stringify(s) }),
};

export interface Skill {
  id: string;
  name: string;
  category: string;
  level: string;
  years: string;
  source: string;
}
export interface Experience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  technologies: string[];
  source?: string;
  description?: string | null;
}
export interface ExperienceInput {
  title: string;
  company: string;
  startDate: string;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string;
  technologies?: string[];
}
export interface JournalEntry {
  id: string;
  rawText: string;
  extractedSkills: string[];
  applied: boolean;
  createdAt: string;
}
export interface Match {
  globalScore: number;
  techScore: number;
  experienceScore: number;
  locationScore: number;
  salaryScore: number;
  seniorityScore: number;
  contractScore: number;
  strengths: string[];
  missingSkills: string[];
  missingTechnologies: string[];
  interviewProbability: 'faible' | 'moyenne' | 'elevee';
  salaryEstimate: string | null;
  readinessDays: number | null;
  recommendations: string | null;
  jobOffer?: { id: string; title: string; company: string | null; location: string | null; url: string; source: string };
}
export interface JobOffer {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  tjm: string | null;
  contractType: string | null;
  source: string;
  url: string;
  description?: string | null;
  technologies: string[];
  scrapedAt: string;
  matches: { globalScore: number; interviewProbability: string }[];
  applications?: { id: string; status: string }[];
}
export interface JobDetail extends JobOffer {
  description: string | null;
  requiredSkills: string[];
  match: Match | null;
}
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
}
export interface CvOutput {
  cvSummary: string;
  linkedinHeadline: string;
  linkedinAbout: string;
  maltPitch: string;
  coverLetter: string;
  atsKeywords: string[];
  method: 'llm' | 'template';
}
export interface MarketAnalysis {
  totalOffers: number;
  topTechnologies: { name: string; count: number }[];
  topRequiredSkills: { name: string; count: number }[];
  salary: { min: number; median: number; max: number } | null;
  tjm: { min: number; median: number; max: number } | null;
  byContract: Record<string, number>;
  skillCoverage: number;
  missingInDemand: string[];
  commentary?: string;
}
export interface CoachPlan {
  focusSkills: string[];
  certifications: string[];
  projectIdeas: string[];
  interviewPrep: string[];
  summary: string;
  method: 'llm' | 'rules';
}
export interface ReportSummary {
  id: string;
  type: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}
export interface ReportFull extends ReportSummary {
  payload: Record<string, unknown>;
}
export interface Preferences {
  desiredRoles: string[];
  locations: string[];
  remote: 'onsite' | 'hybrid' | 'remote';
  searchRadiusKm: number;
  contractTypes: string[];
  tjmMin: number | null;
  tjmMax: number | null;
  keywords: string[];
}
export interface Profile {
  email: string;
  fullName: string | null;
  headline: string | null;
  location: string | null;
  yearsExperience: string;
  employabilityScore: number;
}
export interface Application {
  id: string;
  status: 'draft' | 'pending_review' | 'approved' | 'submitted' | 'interview' | 'offer' | 'rejected' | 'skipped' | 'failed';
  channel: 'manual' | 'email' | 'external_url';
  matchScore: number | null;
  cvSummary: string | null;
  coverLetter: string | null;
  atsKeywords: string[];
  autoSubmitted: boolean;
  submittedAt: string | null;
  interviewAt?: string | null;
  notes: string | null;
  createdAt: string;
  jobOffer?: { title: string; company: string | null; url: string };
}
export interface AutoApplySettings {
  autoApplyEnabled: boolean;
  autoApplyThreshold: number;
  autoApplyDailyLimit: number;
  autoApplyChannel: 'manual' | 'email' | 'external_url';
}
export interface CvCriterion {
  key: string;
  label: string;
  score: number;
  weight: number;
}
export interface CvScore {
  global: number;
  criteria: CvCriterion[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}
export interface CareerMatch {
  sector: string;
  role: string;
  score: number;
  matched: string[];
  missing: string[];
}
export interface RoleScore {
  role: string;
  roleScore: number;
  coverage: number;
  offerCount: number;
  matchedOnRole: boolean;
  demanded: { name: string; count: number; have: boolean }[];
  missingSkills: string[];
  marketSalary: { min: number; median: number; max: number } | null;
  marketTjm: { min: number; median: number; max: number } | null;
  recommendations: string[];
}
export interface OfferMatch {
  title: string;
  matchScore: number;
  matched: string[];
  missingSkills: string[];
  atsKeywords: string[];
  interviewProbability: 'élevée' | 'moyenne' | 'faible';
  recommendation: string;
}
export interface CvImportResult {
  fileName: string;
  extraction: Extraction;
  addedSkills: string[];
  experiencesAdded: number;
  experiencesFound: number;
  experiencesError?: string;
  experiencesDetail: ExperiencePreview[];
  employabilityScore: number;
  cvScore: CvScore;
  careerMatches: CareerMatch[];
}
export interface ExperiencePreview {
  title: string;
  company: string;
  startYear: number | null;
  endYear: number | null;
  isCurrent: boolean;
}
export interface AgentAction {
  type: 'apply' | 'learn' | 'update_cv' | 'network' | 'review';
  label: string;
  detail?: string;
  requiresConfirmation: boolean;
  done?: boolean;
}
export interface AgentDigest {
  narrative: string;
  employabilityScore: number;
  scoreDelta: number;
  topMatches: { offerId: string; title: string; company: string | null; score: number }[];
  marketHighlights: { skillCoverage: number; missingInDemand: string[]; topTechnologies: string[] };
  cvDrafts: { offerId: string; title: string; cvSummary: string; atsKeywords: string[] }[];
  applications?: { prepared: number; submitted: number; pendingReview: number; skippedByLimit: number };
  recommendedActions: AgentAction[];
  method: 'llm' | 'rules';
}
export interface AgentRunRecord {
  id: string;
  trigger: 'manual' | 'scheduled';
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  metrics: { newOffers: number; highMatches: number; notifications: number; scoreBefore: number; scoreAfter: number } | null;
  digest: AgentDigest | null;
}
export interface AgentRunSummary {
  id: string;
  trigger: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  metrics: { newOffers: number; highMatches: number; scoreAfter: number } | null;
}
export interface TrackedApplication {
  id: string;
  title: string;
  company: string | null;
  url: string;
  status: 'draft' | 'pending_review' | 'approved' | 'submitted' | 'interview' | 'offer' | 'rejected' | 'skipped' | 'failed';
  matchScore: number | null;
  submittedAt: string | null;
  interviewAt: string | null;
  needsFollowUp: boolean;
}
export interface DashboardOverview {
  employabilityScore: number;
  cvScore: number | null;
  funnel: {
    interesting: number;
    toApply: number;
    applied: number;
    interview: number;
    offer: number;
    toFollowUp: number;
    rejected: number;
  };
  applications: TrackedApplication[];
}

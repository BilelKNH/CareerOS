/* Lightweight PrismaService mock for unit tests — every model exposes jest.fn()
 * delegates so specs can stub only what they use. */
type AnyFn = jest.Mock;

function model(): Record<string, AnyFn> {
  return {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  };
}

export function makePrisma() {
  return {
    user: model(),
    skill: model(),
    experience: model(),
    project: model(),
    certification: model(),
    jobOffer: model(),
    jobMatch: model(),
    jobPreference: model(),
    notification: model(),
    careerJournal: model(),
    careerMemory: model(),
    memorySnapshot: model(),
    application: model(),
    agentRun: model(),
    report: model(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

/** Minimal ConfigService mock backed by a plain object. */
export function makeConfig(values: Record<string, unknown> = {}) {
  return {
    get: <T>(key: string, def?: T): T => (values[key] as T) ?? (def as T),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

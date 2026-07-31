import { MemoryAgentService } from './memory-agent.service';
import { LlmService } from './llm.service';

// Force the heuristic path (no API key) to verify the spec's canonical example.
const fakeLlm = { available: false } as unknown as LlmService;

describe('MemoryAgentService (heuristic)', () => {
  const agent = new MemoryAgentService(fakeLlm);

  it('expands "pipeline GitHub Actions ... tests Playwright" into the expected concepts', async () => {
    const res = await agent.extract(
      'J’ai mis en place un pipeline GitHub Actions pour automatiser les tests Playwright.',
    );
    const names = res.skills.map((s) => s.name);
    expect(names).toEqual(
      expect.arrayContaining(['GitHub Actions', 'CI/CD', 'Playwright', 'YAML', 'DevOps']),
    );
    expect(res.method).toBe('heuristic');
  });

  it('flags implied concepts as inferred and explicit ones as not', async () => {
    const res = await agent.extract('Pipeline GitHub Actions');
    const ghActions = res.skills.find((s) => s.name === 'GitHub Actions');
    const cicd = res.skills.find((s) => s.name === 'CI/CD');
    expect(ghActions?.inferred).toBe(false);
    expect(cicd?.inferred).toBe(true);
  });
});

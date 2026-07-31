import { experienceKey } from './experience-dedupe';

describe('experienceKey', () => {
  it('is stable regardless of case / spacing', () => {
    expect(experienceKey('QA Engineer', 'Decathlon')).toBe(
      experienceKey('  qa   engineer ', 'DECATHLON'),
    );
  });

  it('treats empty and "N/A" company as the same (stored vs freshly extracted)', () => {
    // Stored with the "N/A" placeholder vs re-extracted with an empty company.
    expect(experienceKey('Testeur', 'N/A')).toBe(experienceKey('Testeur', ''));
    expect(experienceKey('Testeur', null)).toBe(experienceKey('Testeur', 'N/A'));
  });

  it('distinguishes different companies', () => {
    expect(experienceKey('QA', 'Acme')).not.toBe(experienceKey('QA', 'Globex'));
  });
});

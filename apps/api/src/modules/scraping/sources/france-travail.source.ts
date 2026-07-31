import { Logger } from '@nestjs/common';
import { OfferSource } from '@prisma/client';
import { JobSource, RawOffer, SearchQuery } from '../job-source.interface';
import { detectTech } from '../tech-keywords';

const TOKEN_URL =
  'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire';
const SEARCH_URL = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';
const SCOPE = 'api_offresdemploiv2 o2dsoffre';

// Location string -> INSEE department code (France Travail `departement` param).
const DEPARTMENT_MAP: Record<string, string> = {
  lille: '59', nord: '59', roubaix: '59', tourcoing: '59',
  paris: '75', lyon: '69', rhône: '69', marseille: '13',
  toulouse: '31', bordeaux: '33', nantes: '44', lille_metropole: '59',
  rennes: '35', strasbourg: '67', 'hauts-de-france': '59',
};

export function resolveDepartement(locations: string[]): string | null {
  for (const loc of locations) {
    const code = DEPARTMENT_MAP[loc.trim().toLowerCase()];
    if (code) return code;
  }
  return null;
}

// City -> INSEE commune code (for radius search via `commune` + `distance`).
const COMMUNE_MAP: Record<string, string> = {
  lille: '59350', roubaix: '59512', tourcoing: '59599', lens: '62498', arras: '62041',
  paris: '75056', lyon: '69123', marseille: '13055', toulouse: '31555', bordeaux: '33063',
  nantes: '44109', rennes: '35238', strasbourg: '67482', nice: '06088', montpellier: '34172',
};

export function resolveCommune(locations: string[]): string | null {
  for (const loc of locations) {
    const code = COMMUNE_MAP[loc.trim().toLowerCase()];
    if (code) return code;
  }
  return null;
}

interface FtOffer {
  id: string;
  intitule: string;
  description?: string;
  entreprise?: { nom?: string };
  lieuTravail?: { libelle?: string };
  typeContratLibelle?: string;
  salaire?: { libelle?: string };
  dateCreation?: string;
  origineOffre?: { urlOrigine?: string };
  competences?: { libelle?: string }[];
  contact?: { courriel?: string };
}

/**
 * Official France Travail (ex Pôle emploi) "Offres d'emploi v2" API source.
 * OAuth2 client-credentials; enabled only when credentials are configured.
 * Compliant by design — no scraping, official quota-limited API.
 */
export class FranceTravailSource implements JobSource {
  readonly source = OfferSource.francetravail;
  readonly enabled: boolean;
  private readonly logger = new Logger(FranceTravailSource.name);
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly clientId?: string,
    private readonly clientSecret?: string,
  ) {
    this.enabled = Boolean(clientId && clientSecret);
  }

  private async getToken(): Promise<string | null> {
    if (this.token && this.token.expiresAt > Date.now() + 5000) return this.token.value;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
      scope: SCOPE,
    });
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      this.logger.error(`FT token failed: ${res.status} ${await res.text()}`);
      return null;
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return this.token.value;
  }

  async search(query: SearchQuery): Promise<RawOffer[]> {
    if (!this.enabled) return [];
    const token = await this.getToken();
    if (!token) return [];

    const commune = resolveCommune(query.locations);
    const departement = resolveDepartement(query.locations);
    const radius = Math.min(Math.max(query.radiusKm ?? 0, 0), 200);
    const offers = new Map<string, RawOffer>();
    // Limit to a few role searches per run to respect API quotas.
    for (const role of query.roles.slice(0, 4)) {
      const params = new URLSearchParams({
        motsCles: role,
        range: '0-49',
      });
      // Radius search needs an INSEE commune; otherwise fall back to department.
      if (commune && radius > 0) {
        params.set('commune', commune);
        params.set('distance', String(radius));
      } else if (departement) {
        params.set('departement', departement);
      }
      try {
        const res = await fetch(`${SEARCH_URL}?${params}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        // 204 = no results; 206 = partial content (normal for ranged results).
        if (res.status === 204) continue;
        if (!res.ok && res.status !== 206) {
          this.logger.warn(`FT search "${role}" -> ${res.status}`);
          continue;
        }
        const json = (await res.json()) as { resultats?: FtOffer[] };
        for (const o of json.resultats ?? []) {
          const mapped = this.map(o);
          offers.set(mapped.url, mapped);
        }
        await new Promise((r) => setTimeout(r, 400)); // gentle throttle
      } catch (err) {
        this.logger.warn(`FT search "${role}" error: ${(err as Error).message}`);
      }
    }
    this.logger.log(`France Travail: ${offers.size} offres récupérées.`);
    return [...offers.values()];
  }

  private map(o: FtOffer): RawOffer {
    const text = `${o.intitule} ${o.description ?? ''} ${(o.competences ?? [])
      .map((c) => c.libelle)
      .join(' ')}`;
    const technologies = detectTech(text);
    const competenceLabels = (o.competences ?? [])
      .map((c) => c.libelle)
      .filter((l): l is string => Boolean(l))
      .slice(0, 8);
    const requiredSkills = [...new Set([...technologies, ...competenceLabels])];

    return {
      source: this.source,
      externalId: o.id,
      url: o.origineOffre?.urlOrigine ?? `https://candidat.francetravail.fr/offres/recherche/detail/${o.id}`,
      title: o.intitule,
      company: o.entreprise?.nom,
      location: o.lieuTravail?.libelle,
      salary: o.salaire?.libelle,
      contractType: o.typeContratLibelle,
      description: o.description,
      technologies,
      requiredSkills,
      contactEmail: o.contact?.courriel,
      publishedAt: o.dateCreation ? new Date(o.dateCreation) : undefined,
    };
  }
}

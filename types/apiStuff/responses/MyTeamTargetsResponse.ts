// Response type for the new JSON structure
export interface Territory {
  idTerritory: number;
  territoryIdent: string;
  tpIdTerritory: string;
}

export interface Team {
  idTeam: number;
  territory: Territory;
}

export interface Target {
  idTarget: number;
  velo: number;
  gloHilo: number;
  gloHiloPlus: number;
}

export interface BrandmasterTarget {
  idBrandmaster: number;
  imie: string;
  nazwisko: string;
  accountLogin: string;
  idTourplanner: string;
  veloBCP: number;
  hiloBCP: number;
  hiloPlusBCP: number;
  team: Team;
  target: Target;
}

export interface MyTeamTargetsResponse {
  brandmasters: BrandmasterTarget[];
}

// Legacy type for backward compatibility
export interface LegacyMyBmsTargets {
  brandmasterId: number;
  brandmasterName: string;
  brandmasterLast: string;
  brandmasterLogin: string;
  tourplannerId: string | null;
  targetHilo: number;
  targetHiloPlus: number;
  targetVelo: number;
  idTarget: number;
}

// Helper function to map new response to legacy format
export function mapBrandmasterTargetToLegacy(data: BrandmasterTarget): LegacyMyBmsTargets {
  return {
    brandmasterId: data.idBrandmaster,
    brandmasterName: data.imie,
    brandmasterLast: data.nazwisko,
    brandmasterLogin: data.accountLogin,
    tourplannerId: data.idTourplanner,
    targetHilo: data.target.gloHilo,
    targetHiloPlus: data.target.gloHiloPlus,
    targetVelo: data.target.velo,
    idTarget: data.target.idTarget,
  };
}

// Helper function to map array of brandmasters
export function mapBrandmasterTargetsToLegacy(data: BrandmasterTarget[]): LegacyMyBmsTargets[] {
  return data.map(mapBrandmasterTargetToLegacy);
}

// New response type for the updated JSON structure
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

export interface BrandmasterStatsResponse {
  idBrandmaster: number;
  idTourplanner: string;
  accountLogin: string;
  imie: string;
  nazwisko: string;
  veloBCP: number;
  hiloBCP: number;
  hiloPlusBCP: number;
  team: Team;
  target: Target;
}

// Legacy type for backward compatibility
export interface LegacyTargetType {
  bmId: number;
  bmName: string;
  bmLast: string;
  bmLogin: string;
  bmHiloBPC: number;
  bmHiloPluBPC: number;
  bmVeloBPC: number;
  targetHilo: number;
  targetHiloPlus: number;
  targetVelo: number;
  teamName: string;
}

// Helper function to map new response to legacy format
export function mapBrandmasterStatsToLegacy(data: BrandmasterStatsResponse): LegacyTargetType {
  return {
    bmId: data.idBrandmaster,
    bmName: data.imie,
    bmLast: data.nazwisko,
    bmLogin: data.accountLogin,
    bmHiloBPC: data.hiloBCP,
    bmHiloPluBPC: data.hiloPlusBCP,
    bmVeloBPC: data.veloBCP,
    targetHilo: data.target.gloHilo,
    targetHiloPlus: data.target.gloHiloPlus,
    targetVelo: data.target.velo,
    teamName: data.team.territory.territoryIdent,
  };
}

// types/myBms.ts
export interface myBmActions {
  brandmasterId: number;
  brandmasterLogin: string;
  brandmasterName: string;
  brandmasterLastName: string;
  territoryIdent: string;
  supervisorId: number;
  actions: ActionBM[];
}

export interface ActionBM {
  shopId: number;
  shopName: string;
  shopAddress: string;
  eventName: string;

  actionId: number;
  since: string;
  until: string;

  createdAt?: string | null;
  status: string;
}

export interface myBms {
  brandmasterId: number;
  brandmasterLogin: string;
  brandmasterName: string;
  brandmasterLast: string;
  tourplannerId: string | null;
  nrKasoterminal: number | null;
}

export interface myBmsTargets extends myBms {
  idTarget: number | null;
  targetHilo: number | null;
  targetHiloPlus: number | null;
  targetVelo: number | null;
}

export interface Action {
  idAction: number;
  shopID: number;
  shopAddress: string;
  shopName: string;
  shopTPId?: string;
  shopTPIdent?: string;
  eventName: string;
  actionSince: string; // ✅ <-- changed
  actionUntil: string; // ✅ <-- changed
  actionStatus?: string;
  brandmasterID?: number;
  brandmasterTPID?: string;
  brandmasterImie?: string;
  brandmasterNazwisko?: string;
  brandmasterLogin?: string;
}
export interface ActionDetail {
    idAction: number,
    shopID: number,
    shopAddress: string,
    brandmasterID: number,
    eventName: string,
    since: Date,
    until: Date,
    actionRealSince?: Date,
    actionRealUntill?: Date
}
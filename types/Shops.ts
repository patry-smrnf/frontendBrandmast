export interface shopRes {
    idShop: number,
    addressShop: string,
    nameShop:string,
    eventName:string,
    geoLat: string,
    geoLng: string,
    hiloQty: number | null,
    hiloPlusQty: number | null,
    packsQty: number | null
};

export interface importShop {
    streetAddress: string,
    geoLat: string,
    geoLng: string,
    tpIdent: string,
    tpShopId: string,
    idEvent: number,
    idTeam: number,
    name: string
}
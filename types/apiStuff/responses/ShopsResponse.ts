// Response type for the new JSON structure
export interface Event {
  id: number;
  name: string;
  tpEventId: string;
}

export interface Products {
  idProducts: number;
  hilo: number;
  hiloPlus: number;
  packs: number;
  updated: string;
}

export interface Shop {
  id: number;
  address: string;
  geoLat: string;
  geoLng: string;
  tpIdent: string;
  tpShopId: string;
  name: string;
  event: Event;
  products: Products | null;
}

export type ShopsResponse = Shop[];

// Legacy type for backward compatibility
export interface LegacyShopRes {
  idShop: number;
  nameShop: string;
  addressShop: string;
  eventName: string;
  geoLat: string;
  geoLng: string;
  hiloPlusQty: number | null;
  hiloQty: number | null;
  packsQty: number | null;
}

// Helper function to map new response to legacy format
export function mapShopToLegacy(shop: Shop): LegacyShopRes {
  return {
    idShop: shop.id,
    nameShop: shop.name,
    addressShop: shop.address,
    eventName: shop.event.name,
    geoLat: shop.geoLat,
    geoLng: shop.geoLng,
    hiloPlusQty: shop.products?.hiloPlus ?? null,
    hiloQty: shop.products?.hilo ?? null,
    packsQty: shop.products?.packs ?? null,
  };
}

// Helper function to map array of shops
export function mapShopsToLegacy(shops: Shop[]): LegacyShopRes[] {
  return shops.map(mapShopToLegacy);
}

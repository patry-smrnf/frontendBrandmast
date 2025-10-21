import { EventInfo } from "../objects/event.types";
import { Shop } from "../objects/shop.types";

// !-- Main record ---
export interface MyAction {
  id: number;
  status: string;
  since: string;
  until: string;
  createdAt: string;
  shop: Shop;
  event: EventInfo;
}

import { Shop } from "../objects/shop.types";
import { EventInfo } from "../objects/event.types";
import { Products } from "../objects/products.types";

export interface AllShopsResponse extends Shop {
    event: EventInfo
    products?: Products
}
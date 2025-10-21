import { Brandmater } from "../objects/brandmaster.types";
import { EventInfo } from "../objects/event.types";
import { Shop } from "../objects/shop.types";
import { Team } from "../objects/team.types";

interface ActionType {
    id: number,
    status: string,
    since: string,
    until: string,
    createdAt: string,
    shop: Shop,
    event: EventInfo
}

export interface MyBmsActionsResponse extends Brandmater {
    team: Team,
    actions: ActionType[]
}
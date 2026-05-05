import { computePricingAdvice } from "@ari/agents";
import type { AriStore } from "../../store";
import { ListingRepository } from "./listing.repository";

export class ListingService {
  readonly repository: ListingRepository;

  constructor(private readonly store: AriStore) {
    this.repository = new ListingRepository(store);
  }

  getListing(id: string) {
    return this.repository.get(id);
  }

  getScore(id: string) {
    return this.store.scores.find((score) => score.listingId === id);
  }

  getPricingAdvice(id: string) {
    const detail = this.repository.get(id);
    return computePricingAdvice(detail.listing, this.store.listings);
  }

  getBuildingRisk(id: string) {
    return this.repository.get(id).buildingRisk;
  }
}

import type { AriStore } from "../../store";

export class ListingRepository {
  constructor(private readonly store: AriStore) {}

  list() {
    return this.store.listings;
  }

  get(id: string) {
    return this.store.getListing(id);
  }

  importUrl(sourceUrl: string) {
    return this.store.importListingUrl(sourceUrl);
  }

  save(id: string) {
    return this.store.saveListing(id, "SAVED");
  }

  reject(id: string) {
    return this.store.saveListing(id, "REJECTED");
  }
}

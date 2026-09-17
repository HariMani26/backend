import {
    ProfileSearchFilters,
    profileService,
} from "@services/profile.service";
import { resolvePrimaryPhotoUrls } from "@utils/profilePhotoUrls";
import { toProfileSummary } from "@utils/serializers";
import { Container, Service } from "typedi";

export interface SearchResult {
  items: ReturnType<typeof toProfileSummary>[];
  total: number;
  page: number;
  limit: number;
}

@Service()
export class SearchService {
  public async search(
    filters: ProfileSearchFilters,
    page: number,
    limit: number,
    includePhotos = true,
  ): Promise<SearchResult> {
    const { items, total } = await profileService.search(filters, page, limit);
    const photoUrlByFileId = includePhotos ? await resolvePrimaryPhotoUrls(items) : new Map<string, string>();

    return {
      items: items.map((profile) =>
        toProfileSummary(
          profile,
          profile.primaryPhotoId
            ? photoUrlByFileId.get(String(profile.primaryPhotoId))
            : undefined,
        ),
      ),
      total,
      page,
      limit,
    };
  }
}

export const searchService = Container.get(SearchService);

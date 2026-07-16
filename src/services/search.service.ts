import {
    ProfileSearchFilters,
    profileService,
} from "@services/profile.service";
import { resolvePrimaryPhotoUrls } from "@utils/profilePhotoUrls";
import { toProfileSummary } from "@utils/serializers";

export interface SearchResult {
  items: ReturnType<typeof toProfileSummary>[];
  total: number;
  page: number;
  limit: number;
}

export const searchService = {
  async search(
    filters: ProfileSearchFilters,
    page: number,
    limit: number,
  ): Promise<SearchResult> {
    const { items, total } = await profileService.search(filters, page, limit);
    const photoUrlByFileId = await resolvePrimaryPhotoUrls(items);

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
  },
};

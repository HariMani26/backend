import { ProfileSearchFilters, profileRepository } from '@repositories/profile.repository';
import { toProfileSummary } from '@utils/serializers';
import { resolvePrimaryPhotoUrls } from '@utils/profilePhotoUrls';

export interface SearchResult {
  items: ReturnType<typeof toProfileSummary>[];
  total: number;
  page: number;
  limit: number;
}

export const searchService = {
  async search(filters: ProfileSearchFilters, page: number, limit: number): Promise<SearchResult> {
    const { items, total } = await profileRepository.search(filters, page, limit);
    const photoUrlByFileId = await resolvePrimaryPhotoUrls(items);

    return {
      items: items.map((profile) =>
        toProfileSummary(profile, profile.primaryPhotoId ? photoUrlByFileId.get(String(profile.primaryPhotoId)) : undefined),
      ),
      total,
      page,
      limit,
    };
  },
};

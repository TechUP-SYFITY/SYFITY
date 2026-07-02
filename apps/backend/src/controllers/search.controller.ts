import { Get, Query, Route, Security, SuccessResponse, Tags } from 'tsoa';

import type { SearchResponse } from '@syfity/shared';

import type { SearchService } from '../services/search.service';

type SearchControllerService = Pick<SearchService, 'search'>;

@Route('search')
@Tags('Search')
@Security('jwt')
export class SearchController {
  constructor(private readonly searchService: SearchControllerService) {}

  /**
   * YouTube 영상 검색. 동일 검색어는 5분간 캐싱된다.
   * @param q 검색어 (필수)
   */
  @Get()
  @SuccessResponse(200, 'OK')
  async search(@Query() q: string): Promise<SearchResponse> {
    const items = await this.searchService.search(q);
    return { success: true, data: { items } };
  }
}

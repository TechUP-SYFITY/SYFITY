// E2E 전용 YouTube 클라이언트 스텁.
//
// 검색·곡 추가는 브라우저가 아니라 **서버**가 YouTube Data API를 호출하므로,
// Playwright의 page.route로는 막을 수 없다. 그래서 클라이언트 자체를 교체한다.
//
// 목적은 두 가지다.
//   1) 외부 네트워크·API 키 없이 돌아가게 한다 (쿼터 소진·네트워크 불안정 제거).
//   2) 같은 입력에 항상 같은 결과를 준다 (E2E 단언을 고정값으로 쓸 수 있다).
import type { IYouTubeClient, YouTubeSearchItem, YouTubeVideoDetail } from './youtube.client';
import { YOUTUBE_MUSIC_CATEGORY_ID } from './youtube.client';

// 1x1 투명 PNG. 실제 URL을 쓰면 브라우저가 외부 이미지를 받아오므로 data URI로 고정한다.
const FAKE_THUMBNAIL_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const NON_MUSIC_CATEGORY_ID = '22';

const track = (index: number): YouTubeVideoDetail => ({
  // 실제 YouTube videoId와 같은 11자를 유지한다.
  videoId: `e2eTrack${String(index).padStart(3, '0')}`,
  title: `E2E 테스트 트랙 ${String(index).padStart(2, '0')}`,
  channelTitle: 'Syfity E2E Channel',
  thumbnailUrl: FAKE_THUMBNAIL_URL,
  duration: 180 + index, // 곡마다 다른 길이로 두어 표시 로직을 구분할 수 있게 한다
  embeddable: true,
  madeForKids: false,
  categoryId: YOUTUBE_MUSIC_CATEGORY_ID,
});

/**
 * E2E가 참조하는 고정 카탈로그.
 *
 * 정상 곡 10개 외에 예외 흐름용 두 건을 포함한다.
 * - `e2eNoEmbed1` : 임베드 불가 → 곡 추가 시 PLAYLIST_VIDEO_UNAVAILABLE
 * - `e2eNonMusic` : 음악 카테고리가 아님 → SearchService의 카테고리 필터에서 제외
 *
 * 카탈로그에 없는 videoId는 빈 결과를 반환해 "존재하지 않는 영상" 흐름을 만든다.
 */
export const FAKE_YOUTUBE_CATALOG: readonly YouTubeVideoDetail[] = [
  ...Array.from({ length: 10 }, (_, index) => track(index + 1)),
  {
    videoId: 'e2eNoEmbed1',
    title: 'E2E 임베드 불가 트랙',
    channelTitle: 'Syfity E2E Channel',
    thumbnailUrl: FAKE_THUMBNAIL_URL,
    duration: 200,
    embeddable: false,
    madeForKids: false,
    categoryId: YOUTUBE_MUSIC_CATEGORY_ID,
  },
  {
    videoId: 'e2eNonMusic',
    title: 'E2E 뮤직 아닌 영상',
    channelTitle: 'Syfity E2E Channel',
    thumbnailUrl: FAKE_THUMBNAIL_URL,
    duration: 210,
    embeddable: true,
    madeForKids: false,
    categoryId: NON_MUSIC_CATEGORY_ID,
  },
];

export class FakeYouTubeClient implements IYouTubeClient {
  constructor(private readonly catalog: readonly YouTubeVideoDetail[] = FAKE_YOUTUBE_CATALOG) {}

  /**
   * 제목·채널명에 검색어가 포함된 항목을 반환한다.
   * 일치하는 항목이 없으면 빈 배열을 반환해 "검색 결과 없음" 상태도 테스트할 수 있게 한다.
   */
  search(query: string, maxResults = 10): Promise<YouTubeSearchItem[]> {
    const keyword = query.trim().toLowerCase();
    const matched = this.catalog.filter(
      (video) =>
        video.title.toLowerCase().includes(keyword) ||
        video.channelTitle.toLowerCase().includes(keyword),
    );

    return Promise.resolve(
      matched.slice(0, maxResults).map(({ videoId, title, channelTitle, thumbnailUrl }) => ({
        videoId,
        title,
        channelTitle,
        thumbnailUrl,
      })),
    );
  }

  /** 요청한 순서를 유지하고, 카탈로그에 없는 id는 결과에서 제외한다(실제 API와 동일한 동작). */
  getVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetail[]> {
    const byVideoId = new Map(this.catalog.map((video) => [video.videoId, video]));

    return Promise.resolve(
      videoIds
        .map((videoId) => byVideoId.get(videoId))
        .filter((video): video is YouTubeVideoDetail => video !== undefined),
    );
  }
}

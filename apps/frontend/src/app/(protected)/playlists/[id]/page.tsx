// 내 플레이리스트 상세 페이지: URL 파라미터를 Client 위젯에 전달한다.
import { PersonalPlaylistDetail } from '@/widgets/personal-playlist/PersonalPlaylistDetail';

interface PlaylistDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PlaylistDetailPage({ params }: PlaylistDetailPageProps) {
  const { id } = await params;

  return <PersonalPlaylistDetail playlistId={id} />;
}

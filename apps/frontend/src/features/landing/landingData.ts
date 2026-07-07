import { ListMusic, MessageCircle, Radio, UserPlus, type LucideIcon } from 'lucide-react';

export interface LandingFeature {
  icon: LucideIcon;
  tone: 'primary' | 'accent';
  title: string;
  description: string;
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    icon: Radio,
    tone: 'primary',
    title: '실시간 듣기 동기화',
    description: '친구들과 완벽히 싱크된 음악을 함께. 재생, 일시정지, 탐색이 모두 동시에.',
  },
  {
    icon: ListMusic,
    tone: 'accent',
    title: '함께 만드는 플레이리스트',
    description: '누구나 곡을 추가하고 순서를 정할 수 있는 공동 편집 플레이리스트.',
  },
  {
    icon: MessageCircle,
    tone: 'primary',
    title: '실시간 채팅',
    description: '음악이 흘러가는 순간, 대화를 나눠보세요. 실시간 메시지.',
  },
  {
    icon: UserPlus,
    tone: 'accent',
    title: '간편한 초대',
    description: '링크 하나로 친구를 초대. 바로 참여 가능.',
  },
];

export const LOGIN_ROUTE = '/login';

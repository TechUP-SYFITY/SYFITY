import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { UserMenu } from './UserMenu';
import type { AuthApi, UserProfile } from '../api/authApi';

const baseUser: UserProfile = {
  id: 'user-1',
  email: 'alice@syfity.com',
  nickname: 'Alice',
  profileImage: null,
};

// 스토리별로 getMe 동작을 주입해 로딩/정상/이미지 유무 상태를 결정적으로 보여준다.
const makeApi = (getMe: AuthApi['getMe']): AuthApi =>
  ({
    getMe,
    logout: async () => {},
    loginWithGoogle: () => {},
  }) as AuthApi;

const meta = {
  title: 'Auth/UserMenu',
  component: UserMenu,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      return (
        <QueryClientProvider client={queryClient}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: 320 }}>
            <Story />
          </div>
        </QueryClientProvider>
      );
    },
  ],
} satisfies Meta<typeof UserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedIn: Story = {
  args: {
    api: makeApi(async () => ({
      ...baseUser,
      profileImage: 'https://i.pravatar.cc/80?img=5',
    })),
  },
};

export const WithoutProfileImage: Story = {
  args: {
    api: makeApi(async () => baseUser),
  },
};

export const Loading: Story = {
  args: {
    // 영원히 대기 → 로딩 스켈레톤 아바타
    api: makeApi(() => new Promise<UserProfile>(() => {})),
  },
};

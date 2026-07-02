import type { Preview } from '@storybook/nextjs-vite';
import { pretendard } from '../src/shared/lib/fonts';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },

    backgrounds: {
      options: { 'syfity-dark': { name: 'Syfity Dark', value: '#09090B' } },
    },
  },

  initialGlobals: {
    backgrounds: { value: 'syfity-dark' },
  },

  // 다크 퍼스트 토큰·Pretendard가 스토리에도 적용되도록 감싼다
  decorators: [
    (Story) => (
      <div className={`${pretendard.variable} bg-background font-sans text-foreground`}>
        <Story />
      </div>
    ),
  ],
};

export default preview;

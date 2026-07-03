import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from './Button';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIconBadge,
  DialogTitle,
  DialogTrigger,
} from './Dialog';
import { Input } from './Input';

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

// Create Room 모달
export const CreateRoom: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <PlusIcon />방 만들기
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <DialogIconBadge>
              <PlusIcon />
            </DialogIconBadge>
            <DialogTitle>방 만들기</DialogTitle>
          </div>
          <DialogCloseButton />
        </DialogHeader>
        <DialogDescription className="sr-only">
          방 이름을 입력하고 만들기를 누르세요.
        </DialogDescription>
        <DialogBody>
          <label className="text-xs font-semibold text-white/65" htmlFor="room-name">
            방 이름 <span className="text-primary">*</span>
          </label>
          <Input id="room-name" placeholder="Chill Night" />
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" className="w-full">
              취소
            </Button>
          </DialogClose>
          <Button variant="primary" className="w-full">
            <PlusIcon />
            만들기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

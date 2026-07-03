'use client';

// Room 멤버의 이니셜 아바타와 온라인 상태 점을 표시한다.
const AVATAR_TONES = [
  'from-[#f05274] to-[#7f4fd8]',
  'from-[#f59f45] to-[#f05274]',
  'from-[#40c4ff] to-[#7f4fd8]',
  'from-[#72f4a4] to-[#2b8c60]',
  'from-[#f4d772] to-[#e25d76]',
  'from-[#a78bfa] to-[#4ade80]',
];

export function Avatar({
  label,
  muted = false,
  size = 'md',
}: {
  label: string;
  muted?: boolean;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  const toneClass = getAvatarTone(label);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ${toneClass} ${
        muted ? 'opacity-45' : ''
      } ${sizeClass}`}
    >
      {label.slice(0, 1)}
      {size === 'md' ? (
        <span
          className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[#09090b] ${
            muted ? 'bg-white/18' : 'bg-[#72f4a4] shadow-[0_0_6px_rgba(114,244,164,0.9)]'
          }`}
        />
      ) : null}
    </span>
  );
}

function getAvatarTone(label: string) {
  const code = Array.from(label).reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return AVATAR_TONES[code % AVATAR_TONES.length];
}

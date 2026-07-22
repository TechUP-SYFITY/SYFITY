interface YoutubeAttributionLinkProps {
  variant?: 'light' | 'dark';
}

export function YoutubeAttributionLink({ variant = 'dark' }: YoutubeAttributionLinkProps) {
  return (
    <a
      href="https://youtube.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="YouTube"
      className="inline-flex shrink-0 items-center"
    >
      <img
        src={variant === 'dark' ? '/brand/youtube-icon-dark.png' : '/brand/youtube-icon-light.png'}
        alt="YouTube"
        className="h-4 w-auto"
      />
    </a>
  );
}

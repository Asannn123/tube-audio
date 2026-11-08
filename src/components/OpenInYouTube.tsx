import { getOpenLink } from '../utils/youtubeLinks';

interface Props {
  videoId?: string | null;
  playlistId?: string | null;
  playlistIndex?: number | null;
  label?: string;
  small?: boolean;
  testId?: string;
}

function YouTubeIcon() {
  return (
    <svg className="yt-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="1" y="5" width="22" height="14" rx="4" fill="#ff2d2d" />
      <path d="M10 9.2v5.6l5-2.8z" fill="#fff" />
    </svg>
  );
}

export default function OpenInYouTube({ videoId, playlistId, playlistIndex, label = 'Open in YouTube', small, testId }: Props) {
  const link = getOpenLink({ videoId, playlistId, playlistIndex });
  const cls = 'btn mono' + (small ? ' small' : '');
  const inner = (<><YouTubeIcon />{label}</>);
  if (!link) return <button type="button" className={cls} disabled data-testid={testId}>{inner}</button>;
  return (
    <a
      className={cls}
      href={link.href}
      data-testid={testId}
      aria-label={`${label}: opens the YouTube app or website`}
      {...(link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {inner}
    </a>
  );
}

interface AvatarStackProps {
  avatars: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    color?: string;
  }>;
  max?: number;
  /** Pixel size of each avatar, or 'sm' / 'md' preset */
  size?: number | 'sm' | 'md';
}

export function AvatarStack({ avatars, max = 4, size = 'md' }: AvatarStackProps) {
  const shown = avatars.slice(0, max);
  const overflow = avatars.length - max;
  const px = typeof size === 'number' ? size : size === 'sm' ? 22 : 28;

  return (
    <div className="avatar-stack" style={{ height: px }}>
      {shown.map((av) => (
        <div
          key={av.id}
          className="av"
          title={av.name}
          style={{
            width: px,
            height: px,
            background: av.color
              ? `linear-gradient(135deg, ${av.color}88, ${av.color})`
              : undefined,
          }}
        >
          {av.avatarUrl
            ? <img src={av.avatarUrl} alt={av.name} />
            : <span>{av.name.charAt(0).toUpperCase()}</span>
          }
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="av av-overflow"
          style={{ width: px, height: px, fontSize: '0.60rem' }}
          title={`${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

import React from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizeStyles: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-2xl',
};

const nameColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500',
  'bg-pink-500', 'bg-rose-500',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return nameColors[Math.abs(hash) % nameColors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
  shape?: 'circle' | 'square';
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'md',
  className = '',
  shape = 'circle',
}) => {
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const fallbackColor = name ? getColorFromName(name) : 'bg-gray-400';
  const initials = name ? getInitials(name) : '?';

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={`${sizeStyles[size]} ${shapeClass} object-cover border border-gray-200 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeStyles[size]} ${shapeClass} ${fallbackColor} text-white flex items-center justify-center font-medium border border-gray-200 ${className}`}
      aria-label={name || 'Avatar'}
    >
      {initials}
    </div>
  );
};

export interface AvatarGroupProps {
  avatars: { src?: string; name?: string; alt?: string }[];
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 5,
  size = 'md',
  className = '',
}) => {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={`flex -space-x-2 ${className}`} aria-label={`${avatars.length} usuarios`}>
      {visible.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          name={avatar.name}
          alt={avatar.alt}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {remaining > 0 && (
        <div
          className={`${sizeStyles[size]} rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium border-2 border-white`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

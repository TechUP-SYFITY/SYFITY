interface SearchIconProps {
  className?: string;
}

const iconStrokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  vectorEffect: 'non-scaling-stroke',
} as const;

function iconClassName(className?: string) {
  return className ? `block ${className}` : 'block';
}

export function MusicIcon({ className }: SearchIconProps) {
  return (
    <svg className={iconClassName(className)} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18V5l12-2v13" strokeWidth="1.8" {...iconStrokeProps} />
      <circle cx="6" cy="18" r="3" strokeWidth="1.8" {...iconStrokeProps} />
      <circle cx="18" cy="16" r="3" strokeWidth="1.8" {...iconStrokeProps} />
    </svg>
  );
}

export function SearchIcon({ className }: SearchIconProps) {
  return (
    <svg className={iconClassName(className)} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7.25" strokeWidth="1.8" {...iconStrokeProps} />
      <path d="m20 20-3.85-3.85" strokeWidth="1.8" {...iconStrokeProps} />
    </svg>
  );
}

export function LinkIcon({ className }: SearchIconProps) {
  return (
    <svg className={iconClassName(className)} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 0 7.54.54l2.2-2.2a5 5 0 0 0-7.08-7.08l-1.26 1.26"
        strokeWidth="1.8"
        {...iconStrokeProps}
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54l-2.2 2.2a5 5 0 0 0 7.08 7.08l1.26-1.26"
        strokeWidth="1.8"
        {...iconStrokeProps}
      />
    </svg>
  );
}

export function CloseIcon({ className }: SearchIconProps) {
  return (
    <svg className={iconClassName(className)} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" strokeWidth="1.9" {...iconStrokeProps} />
    </svg>
  );
}

export function ChevronDownIcon({ className }: SearchIconProps) {
  return (
    <svg className={iconClassName(className)} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 10 5 5 5-5" strokeWidth="1.9" {...iconStrokeProps} />
    </svg>
  );
}

export function PlusIcon({ className }: SearchIconProps) {
  return (
    <svg className={iconClassName(className)} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeWidth="2" {...iconStrokeProps} />
    </svg>
  );
}

export function AlertCircleIcon({ className }: SearchIconProps) {
  return (
    <svg className={iconClassName(className)} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" strokeWidth="1.8" {...iconStrokeProps} />
      <path d="M12 8v5" strokeWidth="1.8" {...iconStrokeProps} />
      <path d="M12 16.5h.01" strokeWidth="2.4" {...iconStrokeProps} />
    </svg>
  );
}

export function CheckIcon({ className }: SearchIconProps) {
  return (
    <svg className={iconClassName(className)} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.2 4.2L19 7" strokeWidth="2" {...iconStrokeProps} />
    </svg>
  );
}

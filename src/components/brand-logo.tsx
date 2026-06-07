import Image from 'next/image';

const LOGO_SIZES = {
  sm: 32,
  md: 36,
  lg: 56,
} as const;

export type BrandLogoSize = number | keyof typeof LOGO_SIZES;

type BrandLogoProps = {
  size?: BrandLogoSize;
  className?: string;
  priority?: boolean;
  /** Reserved for layouts that optionally render label text alongside the mark. */
  showText?: boolean;
};

function resolveLogoSize(size: BrandLogoSize): number {
  return typeof size === 'number' ? size : LOGO_SIZES[size];
}

export function BrandLogo({ size = 'md', className = '', priority = false }: BrandLogoProps) {
  const px = resolveLogoSize(size);

  return (
    <Image
      src="/logo.png"
      alt="Baha Buddy"
      width={px}
      height={px}
      className={className}
      priority={priority}
    />
  );
}

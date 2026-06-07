import Image from 'next/image';

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ size = 36, className = '', priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Baha Buddy"
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}

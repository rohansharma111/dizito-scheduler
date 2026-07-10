import Image from "next/image";

type Props = {
  size?: number;
  className?: string;
};

export default function GoogleBusinessIcon({ size = 20, className }: Props) {
  return (
    <Image
      src="/icons/google-business-profile.svg"
      alt="Google Business Profile"
      width={size}
      height={size}
      className={className}
    />
  );
}

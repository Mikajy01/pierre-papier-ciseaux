export function Logo({ size = 32 }: { size?: number }) {
  return <img src="/logo.png" alt="" width={size} height={size} className="rounded-md object-cover" />;
}

/** Small version of the logo: the original artwork is 1024px and far too heavy for the interface. */
export function Logo({ size = 32 }: { size?: number }) {
  return <img src="/logo-128.png" alt="" width={size} height={size} className="rounded-md object-cover" />;
}

// The Tangents mark: X's logo with both strokes drawn as the wide outlined bar.
// The bar from top left to bottom right sits in front.
import { useId } from "react";

const FRONT_OUTER = "M1.254 2.25H8.08L22.827 21.75H16.17Z";
const FRONT = `${FRONT_OUTER}M5.117 4.126H7.084L18.916 19.77H17.083Z`;
const BACK = "M22.827 2.25H16.001L1.254 21.75H7.911ZM18.964 4.126H16.997L5.165 19.77H6.998Z";

export function Logo({ size = 30, className }: { size?: number; className?: string }) {
  const maskId = `logo-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" role="img" aria-label="X">
      <defs>
        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          <path d={FRONT_OUTER} fill="black" />
        </mask>
      </defs>
      <path d={BACK} fillRule="evenodd" mask={`url(#${maskId})`} />
      <path d={FRONT} fillRule="evenodd" />
    </svg>
  );
}

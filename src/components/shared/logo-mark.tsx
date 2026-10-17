import type { SVGProps } from 'react';

/** GitReview brand mark: a branch whose merge node carries an approval check. */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="355 325 560 560"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <g stroke="currentColor" strokeWidth="46">
        <circle cx="457" cy="416" r="61" />
        <circle cx="457" cy="796" r="61" />
        <path d="M457 477v258" />
        <path d="M490 468c24 84 70 132 150 132h48" />
        <circle cx="787" cy="600" r="91" strokeWidth="42" />
      </g>
      <path d="M750 602l26 27 50-52" stroke="#22c55e" strokeWidth="30" />
    </svg>
  );
}

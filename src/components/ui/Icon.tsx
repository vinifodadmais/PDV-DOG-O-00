import type { SVGProps } from "react";
import type { IconName } from "@/types";

export type { IconName };

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const paths: Record<IconName, JSX.Element> = {
  home: (
    <path d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
  ),
  sale: (
    <path d="M4 6h16l-1.5 9.5a2 2 0 0 1-2 1.5H7.5a2 2 0 0 1-2-1.5L4 6Zm4 0V5a4 4 0 1 1 8 0v1M9 11h6" />
  ),
  box: (
    <path d="m3.5 8 8.5-4 8.5 4-8.5 4-8.5-4Zm0 0v8l8.5 4m0-12v12m0-12 8.5-4m-8.5 16 8.5-4V8" />
  ),
  cash: (
    <path d="M3 7h18v10H3V7Zm9 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM6 7v10m12-10v10" />
  ),
  settings: (
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5a7.9 7.9 0 0 0-.15-1.53l2.02-1.58-2-3.46-2.38.96a8 8 0 0 0-2.65-1.53L14.5 2h-5l-.34 2.86a8 8 0 0 0-2.65 1.53l-2.38-.96-2 3.46 2.02 1.58a8 8 0 0 0 0 3.06L2.13 15.5l2 3.46 2.38-.96a8 8 0 0 0 2.65 1.53L9.5 22h5l.34-2.47a8 8 0 0 0 2.65-1.53l2.38.96 2-3.46-2.02-1.58c.1-.5.15-1.01.15-1.54Z" />
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  clock: (
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3.5 2" />
  ),
  tag: (
    <path d="M11.5 3H5a2 2 0 0 0-2 2v6.5a2 2 0 0 0 .59 1.41l8.5 8.5a2 2 0 0 0 2.82 0l6.5-6.5a2 2 0 0 0 0-2.82l-8.5-8.5A2 2 0 0 0 11.5 3ZM7.5 8a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1Z" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  edit: (
    <path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3Zm10.5-14.5 3 3" />
  ),
  trash: (
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-7 0 .7 12.1A2 2 0 0 0 9.7 21h4.6a2 2 0 0 0 2-1.9L17 7M10 11v6m4-6v6" />
  ),
  search: (
    <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm9 2-4.35-4.35" />
  ),
  image: (
    <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm2 12 4.5-5 3 3.5L17 11l4 6M9 9.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  alert: (
    <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
  ),
  check: <path d="M5 13l4 4L19 7" />,
  receipt: (
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm2 5h8M8 11h8M8 14h5" />
  ),
  printer: (
    <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M6 14h12v7H6v-7Z" />
  ),
  shield: (
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Zm-2.5 8.5 1.8 1.8 3.2-3.6" />
  ),
};

export function Icon({ name, size = 20, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

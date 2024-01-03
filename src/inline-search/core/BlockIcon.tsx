import React from "react";

export function BlockIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 16 16"
      className="inline-block text-gray-30"
      width={size}
      height={size}
    >
      <rect x="3" y="3.75" width="10" height="1" rx="0.5"></rect>
      <rect x="3" y="6.25" width="10" height="1" rx="0.5"></rect>
      <rect x="3" y="8.75" width="10" height="1" rx="0.5"></rect>
      <rect x="3" y="11.25" width="6" height="1" rx="0.5"></rect>
    </svg>
  );
}

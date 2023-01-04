import React, { FC, ReactNode } from "react";

export const UnderMobile: FC<{ else?: ReactNode }> = (props) => {
  if (window.roamAlphaAPI.platform.isMobile) {
    return <>{props.children}</>;
  }

  return <>{props.else}</>;
};

import React, { FC, PropsWithChildren, ReactNode } from "react";

export const UnderMobile: FC<PropsWithChildren<{ else?: ReactNode }>> = (props) => {
  if (window.roamAlphaAPI.platform.isMobile) {
    return <>{props.children}</>;
  }

  return <>{props.else}</>;
};

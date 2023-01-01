import React, { FC } from "react";

export const UnderMobile: FC = (props) => {
  if (window.roamAlphaAPI.platform.isMobile) {
    return <>{props.children}</>;
  }

  return null;
};

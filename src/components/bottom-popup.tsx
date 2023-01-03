import React, { FC } from 'react';
import { Drawer, DrawerProps, DrawerSize } from '@blueprintjs/core'
import { observer } from '@legendapp/state/react';
import { CONSTNATS } from '../helper';


export const BottomPopup: FC<DrawerProps> = observer((props) => {
    return (
      <Drawer
        size={DrawerSize.LARGE}
        portalClassName={`${CONSTNATS.el}-portal`}
        isCloseButtonShown
        title="Search"
        hasBackdrop={false}
        position="bottom"
        {...props}
      >
        {props.children}
      </Drawer>
    );
})
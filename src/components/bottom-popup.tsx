import React, { FC } from 'react';
import { Drawer, DrawerProps, DrawerSize } from '@blueprintjs/core'
import { observer } from '@legendapp/state/react';


export const BottomPopup: FC<DrawerProps> = observer((props) => {
    return <Drawer size={DrawerSize.LARGE} isCloseButtonShown title="Search" hasBackdrop={false} position="bottom" {...props}>
        {props.children}
    </Drawer>
})
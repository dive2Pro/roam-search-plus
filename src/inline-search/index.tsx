import { Button, Callout, ControlGroup, FormGroup, Icon, InputGroup, Popover, Tooltip } from "@blueprintjs/core";
import { observer, useComputed, useObserveEffect } from "@legendapp/state/react";
import React, { ReactNode, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useObservable } from '@legendapp/state/react'
import { RoamPageFilter } from "../components/RoamPageFilter";
import { Query } from "../query";
import { getAllBlocks, initCache, renewCache2 } from "../roam";
import { delay } from "../delay";
import { isGraphLoaded, setGraphLoaded } from "../loaded";
import { BlockAttrs } from "../extentionApi";
import { RoamTagFilterHeader } from "../components/RoamTagFilterHeader";
import { PullBlock } from "roamjs-components/types";


export function renderNode(node: HTMLElement) {
    console.log(node, ' - renderNode',);
    const id = node.closest("[id^='block-input']")?.id
    if (!id) {
        return
    }
    const blockUid = id.split("-").pop()
    ReactDOM.render(<InlineSearchPlus uid={blockUid} />, node.parentElement)
}


export const InlineSearchPlus = observer((props: { uid: string }) => {
    const ref = useRef<HTMLInputElement>()
    const store = useObservable({
        search: '',
        list: {
            pages: [],
            blocks: []
        },
        selected: [],
        loading: false,
        closed:
            !!BlockAttrs.read(props.uid).closed,
        tags: [] as {
            id: number,
            text: string,
            dbId: number
        }[]
    });
    useComputed(() => {

    })
    type Tag = {
        id: number,
        text: string,
        dbId: number
    }
    const immediateStore = useObservable({
        caseIntensive: false,
        exclude: {
            tags: [] as Tag[], // 引用该 tag
        },
        include: {
            tags: [] as Tag[] // 引用该 tag
        }
    })
    function changeExcludeSelected(obj: {
        id: number,
        text: string,
        dbId: number
    }) {


        const index = immediateStore.exclude.tags.findIndex((_item) => _item.id === obj.id);
        if (index > -1) {
            immediateStore.exclude.tags.splice(index, 1);
        } else {
            immediateStore.exclude.tags.push(obj);
        }
    }

    function changeIncludeSelected(obj: {
        id: number,
        text: string,
        dbId: number
    }) {
        const index = immediateStore.include.tags.findIndex((_item) => _item.id === obj.id);
        if (index > -1) {
            immediateStore.include.tags.splice(index, 1);
        } else {
            immediateStore.include.tags.push(obj);
        }
    }

    const searchWithConfig = () => {
        const _store = immediateStore.get()
        searching({
            ..._store,
            exclude: {
                tags: _store.exclude.tags.map(item => {
                    return item.id
                })
            },
            include: {
                tags: _store.include.tags.map(item => {
                    return item.id
                })
            },
            search: store.search.peek().split(" ")
        });
    }
    const searching = async (config: QueryConfig) => {
        store.loading.set(true);
        if (!isGraphLoaded()) {
            await delay(10)
            await initCache({ blockRefToString: false });
            // initCached = true
            setGraphLoaded(true)
        }
        renewCache2({ blockRefToString: false });
        store.loading.set(false);

        return Query(config).promise
            .then((res) => {
                console.log(res[0], ' = res');
                store.list.set({
                    pages: res[0],
                    blocks: res.slice(1)
                });
                const tags = [] as PullBlock[];
                const addToTags = (items: PullBlock[]) => {
                    console.log(items, ' = items')
                    tags.push(...items)
                }
                res[0].map(item => {
                    addToTags(item.block[":block/refInstances"] || [])
                })

                res[1].map((item) => {
                    addToTags(item.block[":block/refInstances"] || [])
                })

                res[2].map((item) => {
                    item.children.forEach(child => {
                        addToTags(child.block[":block/refInstances"] || [])
                    })
                })
                console.log(tags, ' = tags')
                store.tags.set(tags.map(item => {
                    return {
                        id: item[":db/id"],
                        text: item[":block/string"] || item[":node/title"],
                        dbId: item[":db/id"]
                    }
                }))
            })
    }

    useEffect(() => {
        immediateStore.onChange((prev) => {
            console.log(prev, ' =prev')
            searchWithConfig();
        })
    }, [])

    return <Callout >
        <div className="flex">
            <Button icon={store.closed.get() ? "caret-right" : "caret-down"} minimal onClickCapture={() => {
                store.closed.toggle();
                BlockAttrs.save(props.uid, {
                    closed: store.closed.get()
                })
            }} />
            <ControlGroup onClick={() => ref.current.focus()}>
                <InputGroup
                    leftIcon={
                        store.loading.get() ? (
                            <Icon icon="refresh" size={14} className="loading" />
                        ) : (
                            "search"
                        )
                    }
                    inputRef={ref} value={store.search.get()}
                    onChange={(e) => store.search.set(e.target.value)}
                />
                <Button
                    onClick={() => {
                        searchWithConfig()
                    }}>
                    Search+
                </Button>
                <Tooltip content={"Full Page Reload"}>
                    <Button minimal icon="reset" onClick={() => {
                        setGraphLoaded(false)
                        searchWithConfig()

                    }} />
                </Tooltip>

            </ControlGroup>
        </div>
        <Popover
            disabled={store.tags.length === 0}
            onOpened={() => {
                if (!isGraphLoaded()) {

                }
            }}
            onClosed={() => {
            }}
            autoFocus={false}
            content={<RoamPageFilter
                items={store.tags.get()}
                itemRenderer={(index, item) => {

                    return (
                        <Button
                            minimal fill alignText="left" text={item.text} onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (e.shiftKey) {
                                    // store.actions.conditions.filter.page.exclude.changeSelected(item);
                                    changeExcludeSelected(item)
                                    return
                                }
                                changeIncludeSelected(item)
                            }}>
                        </Button>
                    );
                }}
                header={
                    <RoamTagFilterHeader
                        includes={immediateStore.include.tags.get()}
                        excludes={immediateStore.exclude.tags.get()}
                        onItemAddClick={(item) => {
                            changeIncludeSelected(item);
                        }}
                        onItemRemoveClick={(item => {
                            changeExcludeSelected(item);
                        })}
                        onClearAdded={() => {
                            // store.actions.conditions.filter.page.include.clearSelected();
                        }}
                        onClearexcludes={() => {
                            // store.actions.conditions.filter.page.exclude.clearSelected();
                        }}
                    />
                }
            />}
        >
            <Button
                icon="document"
                alignText="left"
                minimal
                style={{
                    maxWidth: '100%'
                }}
                outlined={!!store.selected.length}
                intent={store.selected.length ? "primary" : 'none'}
                text={
                    <span className={"ellipsis-to-left block " +
                        (store.selected.length ? 'primary' : '')
                    }
                        style={{
                            direction: 'unset',
                            display: 'block',
                        }}
                    >
                        Tag: {store.selected.map(item => item.text).join(",")}
                    </span>
                } />
        </Popover >

    </Callout >
})
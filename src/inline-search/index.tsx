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
    const block = node.closest("[id^='block-input']")
    const id = node.closest("[id^='block-input']")?.id
    if (!id) {
        return
    }
    let uid = id.split("-").pop();
    const searchPlusElements = Array.from(block.querySelectorAll(".rm-xparser-default-search-plus"));
    let index = 0;
    const reg = /{{(\[\[)*search-plus(]])*(:*)([^}}]*)/gi;

    while (searchPlusElements.length) {
        const linkButton = searchPlusElements[index];
        const rmRef = linkButton.closest(".rm-block-ref")
        if (rmRef) {
            uid = rmRef.getAttribute("data-uid")
        }
        const str = window.roamAlphaAPI.pull("[:block/string]", [":block/uid", uid])[":block/string"]

        let result = reg.exec(str);
        // console.log(linkPreviewElements[index], url, result, linkPreviewElements, block, );
        // console.log(linkPreviewElements[index].parentElement, '@@')
        const text = result[4];
        console.log(result, ' ____ url', result[4])
        let inputStr = result.input
        ReactDOM.render(<InlineSearchPlus uid={uid} onSearchChange={search => {
            const nextInputStr = `{{[[search-plus]]: ${search}}}`;
            const str = window.roamAlphaAPI.pull("[:block/string]", [":block/uid", uid])[":block/string"]
            const nextBlockString = str.replace(inputStr, nextInputStr);
            inputStr = nextInputStr;
            BlockAttrs.updateString(uid, nextBlockString);
        }} search={text ? text.trim() : ''} />, searchPlusElements[index++].parentElement)
        result = reg.exec(str);
        if (!result) {
            break
        }
    }
}

type Tag = {
    id: number,
    text: string,
    dbId: number
}

export const InlineSearchPlus = observer((props: {
    onSearchChange: (search: string) => void,
    uid: string, search: string
}) => {
    const ref = useRef<HTMLInputElement>()
    console.log(props, ' = props')
    const store = useObservable(() => {
        return {
            search: props.search,
            list: {
                pages: [],
                blocks: []
            },
            selected: [],
            loading: false,

            tags: [] as {
                id: number,
                text: string,
                dbId: number
            }[]
        }
    });

    
    const immediateStore = useObservable(() => {
        const attrs = BlockAttrs.read(props.uid)
        return {
            caseIntensive: false,
            exclude: {
                tags: (attrs.exclude?.tags || []) as Tag[], // 引用该 tag
            },
            include: {
                tags: (attrs.include?.tags || []) as Tag[] // 引用该 tag
            },
            closed:
                !!attrs.closed,
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
        immediateStore.onChange((value) => {
            BlockAttrs.save(props.uid, value)
        })
        // ref.current.focus();
    }, [])

    return <Callout >
        <div className="flex">
            <Button icon={immediateStore.closed.get() ? "caret-right" : "caret-down"} minimal onClickCapture={() => {
                immediateStore.closed.toggle();

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
                    onChange={(e) => {
                        store.search.set(e.target.value);

                        immediateStore.include.tags.set([]);
                        immediateStore.exclude.tags.set([]);
                    }}
                />
                <Button
                    onClick={() => {
                        props.onSearchChange(store.search.peek());

                        searchWithConfig()
                    }}>
                    Search+
                </Button>
                <Tooltip content={"Full Page Reload"}>
                    <Button minimal icon="reset" onClick={() => {
                        props.onSearchChange(store.search.peek());
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
                items={
                    store.tags.get().filter((tag) => {
                        return !immediateStore.exclude.tags.get().some(excludeTag => {
                            return tag.id === excludeTag.id
                        }) &&
                            !immediateStore.include.tags.get().some(excludeTag => {
                                return tag.id === excludeTag.id
                            })
                    })
                }
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
                            searchWithConfig()
                        }}
                        onItemRemoveClick={(item => {
                            changeExcludeSelected(item);
                            searchWithConfig()
                        })}
                        onClearAdded={() => {
                            immediateStore.include.tags.set([])
                            searchWithConfig()

                            // store.actions.conditions.filter.page.include.clearSelected();
                        }}
                        onClearexcludes={() => {
                            immediateStore.exclude.tags.set([])
                            searchWithConfig()

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
import { Button, Callout, ControlGroup, FormGroup, Icon, IconName, InputGroup, Popover, Tooltip } from "@blueprintjs/core";
import { observer, useComputed, useObserveEffect } from "@legendapp/state/react";
import React, { ReactNode, useEffect, useMemo, useRef } from "react";
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
import { Observable } from "@legendapp/state";


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

type ChildFn<P, S> = {
    children: (v: P) => any,
} & S


function useFormBizObservableStore(attrs: BlockAttrs) {
    return useObservable(() => {
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
}

function useFormBiz(immediateStore: Observable<{
    caseIntensive: boolean,
    exclude: {
        tags: Tag[]
    },
    include: {
        tags: Tag[]
    },
    closed: boolean
}>) {


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

    return {
        toggle: () => {
            immediateStore.closed.toggle();
        },
        caretIcon: immediateStore.closed.get() ? "caret-right" : "caret-down" as IconName,
        tagsFilterClean: () => {
            immediateStore.include.tags.set([]);
            immediateStore.exclude.tags.set([]);
        },
        includeTagsClean: function () {
            immediateStore.include.tags.set([]);
        },
        excludeTagsClean: function () {
            immediateStore.exclude.tags.set([]);
        },
        includeTags: immediateStore.include.tags.get(),
        excludeTags: immediateStore.exclude.tags.get(),
        tagNotFiltered: function (tag: Tag) {
            return !immediateStore.exclude.tags.get().some(excludeTag => {
                return tag.id === excludeTag.id;
            }) &&
                !immediateStore.include.tags.get().some(excludeTag => {
                    return tag.id === excludeTag.id;
                });
        },
        changeExcludeSelected,
        changeIncludeSelected,
        hasTagFiltered: immediateStore.include.tags.get().length > 0 || immediateStore.exclude.tags.get().length > 0,
    } as const
}
function InlineSearchPlus_FormBiz(props: ChildFn<ReturnType<typeof useFormBiz> & {
    doSearch: () => void,
    isLoadingGraph: boolean,
    search: string,
    tags: Tag[],
    filterdTags: Tag[],
    changeSearch(v: string): void
}, {
    uid: string,
    search: string
}>) {
    console.log(props, ' = props')
    const store = useObservable(() => {
        return {
            search: props.search,
            list: {
                pages: [],
                blocks: []
            },
            loading: false,
            tags: [] as {
                id: number,
                text: string,
                dbId: number
            }[]
        }
    });

    const searching = async (config: Omit<QueryConfig, "search">) => {
        store.loading.set(true);
        if (!isGraphLoaded()) {
            await delay(10)
            await initCache({ blockRefToString: false });
            // initCached = true
            setGraphLoaded(true)
        }
        renewCache2({ blockRefToString: false });
        store.loading.set(false);

        return Query({ ...config, search: store.search.peek().split(" ") }).promise
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
        });
    }

    const immediateStore = useFormBizObservableStore(useMemo(() => {
        const attrs = BlockAttrs.read(props.uid)
        return attrs
    }, []))

    useEffect(() => {
        immediateStore.onChange((value) => {
            BlockAttrs.save(props.uid, value)
        })
        // ref.current.focus();
    }, [])

    const biz = useFormBiz(immediateStore);


    return props.children({
        ...biz,
        isLoadingGraph: store.loading.get(),
        search: store.search.get(),
        doSearch: searchWithConfig,
        tags: store.tags.get(),
        filterdTags: store.tags.get().filter(biz.tagNotFiltered),
        changeSearch(search: string) {
            store.search.set(search)
        }
    })
}

export const InlineSearchPlus = observer((props: {
    onSearchChange: (search: string) => void,
    uid: string, search: string
}) => {
    const ref = useRef<HTMLInputElement>()
    const focusInput = () => {
        ref.current.focus()
    }
    return <InlineSearchPlus_FormBiz
        search={props.search}
        uid={props.uid} >
        {
            (formBiz) => {
                return <Callout >
                    <div className="flex">
                        <Button
                            icon={formBiz.caretIcon}
                            minimal
                            onClickCapture={() => {
                                formBiz.toggle()
                            }}
                        />
                        <ControlGroup onClick={() => focusInput()}>
                            <InputGroup
                                leftIcon={
                                    formBiz.isLoadingGraph ? (
                                        <Icon icon="refresh" size={14} className="loading" />
                                    ) : (
                                        "search"
                                    )
                                }
                                inputRef={ref} value={formBiz.search}
                                onChange={(e) => {
                                    formBiz.changeSearch(e.target.value)
                                    formBiz.tagsFilterClean()
                                }}
                            />
                            <Button
                                onClick={() => {
                                    props.onSearchChange(formBiz.search);
                                    formBiz.doSearch()
                                }}>
                                Search+
                            </Button>
                            <Tooltip content={"Full Page Reload"}>
                                <Button
                                    minimal
                                    icon="reset"
                                    onClick={() => {
                                        props.onSearchChange(formBiz.search);
                                        setGraphLoaded(false)
                                        formBiz.doSearch()
                                    }}
                                />
                            </Tooltip>
                        </ControlGroup>
                    </div>
                    <Popover
                        disabled={formBiz.tags.length === 0}
                        onOpened={() => { }}
                        onClosed={() => { }}
                        autoFocus={false}
                        content={
                            <RoamPageFilter
                                items={
                                    formBiz.filterdTags
                                }
                                itemRenderer={(index, item) => {
                                    return (
                                        <Button
                                            minimal fill alignText="left" text={item.text} onClick={e => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (e.shiftKey) {
                                                    // store.actions.conditions.filter.page.exclude.changeSelected(item);
                                                    formBiz.changeExcludeSelected(item)
                                                    return
                                                }
                                                formBiz.changeIncludeSelected(item)
                                            }}>
                                        </Button>
                                    );
                                }}
                                header={
                                    <RoamTagFilterHeader
                                        includes={formBiz.includeTags}
                                        excludes={formBiz.excludeTags}
                                        onItemAddClick={(item) => {
                                            formBiz.changeIncludeSelected(item);
                                            formBiz.doSearch()

                                        }}
                                        onItemRemoveClick={(item => {
                                            formBiz.changeExcludeSelected(item);
                                            formBiz.doSearch()

                                        })}
                                        onClearAdded={() => {
                                            formBiz.includeTagsClean()
                                            formBiz.doSearch()

                                            // store.actions.conditions.filter.page.include.clearSelected();
                                        }}
                                        onClearexcludes={() => {
                                            formBiz.excludeTagsClean();
                                            formBiz.doSearch()

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
                            outlined={formBiz.hasTagFiltered}
                            intent={formBiz.hasTagFiltered ? "primary" : 'none'}
                            text={
                                <span className={"ellipsis-to-left block " +
                                    (formBiz.hasTagFiltered ? 'primary' : '')
                                }
                                    style={{
                                        direction: 'unset',
                                        display: 'block',
                                    }}
                                >
                                    Tag:
                                    {formBiz.includeTags.join(",")}
                                    {formBiz.excludeTags.join(",")}
                                </span>
                            } />
                    </Popover >

                </Callout >
            }
        }
    </InlineSearchPlus_FormBiz>

})
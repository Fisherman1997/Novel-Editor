<template>
    <div class="right-content">
        <div ref="top" class="right-top">
            <div class="top-header">
                <ElSpace>
                    <span>添加</span>
                    <el-button type="primary" size="small" @click="handleAdd">+</el-button>
                </ElSpace>
            </div>
            <el-scrollbar wrap-class="top-content">
                <template v-if="tableData.length" :key="currentRow">
                    <li
                        v-for="(item, index) in tableData"
                        :key="index"
                        :class="{ select: currentRow === index }"
                        @click="currentRow = index"
                    >
                        <div class="item-text">
                            <TitleChange
                                :name="<string>item.name"
                                @change-name="
                                    (value) => fileState.changeName(`${type}Name`, { value, index })
                                "
                            />
                        </div>
                        <div class="item-delete">
                            <el-popconfirm
                                title="确认删除吗？"
                                confirm-button-text="确认"
                                cancel-button-text="取消"
                                @confirm="fileState.delete(type, [index])"
                            >
                                <template #reference>
                                    <el-button type="danger" link>删除</el-button>
                                </template>
                            </el-popconfirm>
                        </div>
                    </li>
                </template>
                <template v-else>
                    <el-empty description="无内容" />
                </template>
            </el-scrollbar>
        </div>
        <div class="right-move" @mousedown="handleMouseDown"></div>
        <div ref="bottom" class="right-bottom">
            <div v-if="type === 'world'" class="world">
                <template v-if="!tableData[currentRow]">
                    <el-empty description="无内容" />
                </template>
                <textarea
                    v-else
                    v-model="<string>tableData[currentRow].content"
                    :style="{ backgroundColor: mainState.background }"
                    @input="mainState.changeFile('isChangeFile', true)"
                ></textarea>
            </div>
            <div v-else class="character">
                <template v-if="!tableData[currentRow]">
                    <el-empty description="无内容" />
                </template>
                <template v-else>
                    <div class="item-bottom">
                        <span>名字</span>
                        <el-input
                            v-model="tableData[currentRow].name"
                            size="small"
                            @input="mainState.changeFile('isChangeFile', true)"
                        ></el-input>
                    </div>
                    <div class="item-bottom">
                        <span>性格</span>
                        <el-input
                            v-model="(tableData[currentRow] as characterType).personality"
                            size="small"
                            @input="mainState.changeFile('isChangeFile', true)"
                        ></el-input>
                    </div>
                    <div class="item-bottom">
                        <span>出场年龄</span>
                        <el-input
                            v-model="(tableData[currentRow] as characterType).ageOfAppearance"
                            size="small"
                            @input="mainState.changeFile('isChangeFile', true)"
                        ></el-input>
                    </div>
                    <div class="item-bottom">
                        <span>长相</span>
                        <el-input
                            v-model="(tableData[currentRow] as characterType).appearance"
                            size="small"
                            @input="mainState.changeFile('isChangeFile', true)"
                        ></el-input>
                    </div>
                    <div class="item-bottom">
                        <span>详情</span>
                        <el-input
                            v-model="tableData[currentRow].content"
                            size="small"
                            autosizec
                            type="textarea"
                            @input="mainState.changeFile('isChangeFile', true)"
                        ></el-input>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElSpace } from 'element-plus'
import { worldViewType, characterType } from '../../../../types/types'
import { mainStore } from '@renderer/store/store.main'
import { fileStore } from '@renderer/store/store.file'

import TitleChange from './TitleChange.vue'

interface Props {
    tableData: worldViewType[] | characterType[]
    type: 'world' | 'character'
}

const fileState = fileStore()
const mainState = mainStore()
const { tableData, type } = defineProps<Props>()
const bottom = ref()
const top = ref()

const currentRow = ref(0)

const handleAdd = () => {
    fileState.addCharacterAndWorld(type)
    nextTick(() => {
        let num = 0
        if (type === 'world') num = fileState.worldView.length - 1
        else num = fileState.character.length - 1
        currentRow.value = num
    })
}

/**
 * 上下拖动改变高度处理函数
 * @param ev
 */
const handleMouseDown = (ev: MouseEvent) => {
    const strY = ev.clientY
    const topDom = top.value as HTMLElement
    const bottomDom = bottom.value as HTMLElement
    const th = topDom.offsetHeight
    const bh = bottomDom.offsetHeight
    const move = (event: MouseEvent) => {
        const newY = event.clientY - strY
        const t = th + newY
        const b = bh + newY * -1
        if (t <= 100 || b <= 100) return
        topDom.style.height = t + 'px'
        bottomDom.style.height = b + 'px'
    }
    const mouseup = () => {
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', mouseup)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', mouseup)
}


onMounted(() => {
    window.onreset = () => {
        const topDom = top.value as HTMLElement
        const bottomDom = bottom.value as HTMLElement
        const height = (topDom.parentNode as HTMLElement).offsetHeight
        console.log(height)
        topDom.style.height = height / 2 - 5 + 'px'
        bottomDom.style.height = height / 2 - 5 + 'px'
    }
})
onBeforeUnmount(() => {
    window.onreset = null
})
</script>

<style scoped lang="less">
.right-content {
    height: 100%;
    .right-bottom {
        height: calc(50% - 5px);
        box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
        .world {
            height: 100%;
            textarea {
                padding: 10px;
                resize: none;
                overflow: auto;
                width: calc(100% - 20px);
                height: calc(100% - 20px);
                line-height: 24px;
                font-size: 14px;
                border: none;
                outline: none;
                // background-color: #fffef5;
            }
            textarea:focus {
                border: none;
                outline: none;
            }
        }
        .character {
            .item-bottom {
                padding: 10px;
                display: flex;
                align-items: center;
                .el-input,
                .el-textarea {
                    flex: 1;
                }
                span::after {
                    content: '：';
                }
            }
        }
    }
    .right-top {
        height: calc(50% - 5px);
        box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        .top-header {
            height: 36px;
            display: flex;
            align-items: center;
            padding-left: 10px;
            box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
        }
        .top-content {
            li {
                display: flex;
                overflow: hidden;
                padding: 0 15px;
                align-items: center;
                height: 30px;
                box-shadow: 0 0 0.5px rgba(0, 0, 0, 1);
                .item-text {
                    line-height: 18px;
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .item-delete {
                    user-select: none;
                    // transform: scale(2);
                    font-size: 18px;
                    line-height: 16px;
                }
            }
            .select {
                background-color: #d9f7ff;
            }
        }
        .el-scrollbar {
            flex: 1;
        }
    }
    .right-move {
        cursor: row-resize;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 10px;
    }
    .right-move::before {
        display: block;
        content: '';
        height: 2px;
        width: 30%;
        background-color: rgba(0, 0, 0, 0.3);
    }
}
</style>

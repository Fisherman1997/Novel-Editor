<template>
    <Teleport to="body">
        <div
            v-if="isVisible"
            class="context-menu"
            :style="{ left: `${x}px`, top: `${y}px` }"
            @click.stop
            @contextmenu.prevent
        >
            <template v-for="(item, index) in items" :key="index">
                <div v-if="item.divider" class="menu-divider" />
                <div
                    v-else
                    class="menu-item"
                    :class="{ danger: item.danger, disabled: item.disabled }"
                    @click="handleClick(item)"
                >
                    <span v-if="item.icon" class="menu-icon">
                        <AppIcon :name="item.icon" :size="14" />
                    </span>
                    <span class="menu-label">{{ item.label }}</span>
                    <span v-if="item.shortcut" class="menu-shortcut">{{ item.shortcut }}</span>
                </div>
            </template>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import type { MenuItem } from '../../composables/useContextMenu'
import AppIcon from './AppIcon.vue'

interface Props {
    isVisible: boolean
    x: number
    y: number
    items: MenuItem[]
}

defineProps<Props>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

const handleClick = (item: MenuItem) => {
    if (item.disabled || item.divider) return
    item.action?.()
    emit('close')
}
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.context-menu {
    position: fixed;
    z-index: 9999;
    min-width: 184px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: @radius-lg;
    box-shadow: var(--shadow-lg);
    padding: 5px;
    animation: menuFadeIn 0.12s ease;
}

@keyframes menuFadeIn {
    from {
        opacity: 0;
        transform: scale(0.96) translateY(-4px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.menu-item {
    display: flex;
    align-items: center;
    padding: 7px 10px;
    cursor: pointer;
    border-radius: @radius-sm;
    transition: background @transition-fast;
    color: var(--text-1);
    font-size: @font-size-base;

    &:hover {
        background: var(--hover);
    }

    &.danger {
        color: var(--danger);

        &:hover {
            background: var(--danger-soft);
        }
    }

    &.disabled {
        color: var(--text-3);
        cursor: not-allowed;

        &:hover {
            background: transparent;
        }
    }
}

.menu-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 10px;
    width: 16px;
    color: var(--text-3);
}

.menu-item.danger .menu-icon {
    color: var(--danger);
}

.menu-label {
    flex: 1;
}

.menu-shortcut {
    margin-left: @spacing-xl;
    font-size: @font-size-xs;
    color: var(--text-3);
    font-family: @font-mono;
}

.menu-divider {
    height: 1px;
    background: var(--border);
    margin: 5px 8px;
}
</style>

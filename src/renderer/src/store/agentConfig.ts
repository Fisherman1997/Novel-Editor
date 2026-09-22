import { defineStore } from 'pinia'
import { AgentConfig } from '@shared/types'

// 模型服务配置只存本机 localStorage，禁止写入 .xstxt（F2.3，防分享书稿泄露密钥）
const STORAGE_KEY = 'agent-config'

const DEFAULT_CONFIG: AgentConfig = {
    baseUrl: '',
    apiKey: '',
    model: '',
    temperature: 0.7,
    maxTokens: 2048
}

function loadConfig(): AgentConfig {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { ...DEFAULT_CONFIG }
        const parsed = JSON.parse(raw)
        return {
            baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
            apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
            model: typeof parsed.model === 'string' ? parsed.model : '',
            temperature:
                typeof parsed.temperature === 'number' && Number.isFinite(parsed.temperature)
                    ? parsed.temperature
                    : DEFAULT_CONFIG.temperature,
            maxTokens:
                typeof parsed.maxTokens === 'number' && Number.isFinite(parsed.maxTokens)
                    ? parsed.maxTokens
                    : DEFAULT_CONFIG.maxTokens
        }
    } catch {
        return { ...DEFAULT_CONFIG }
    }
}

export const useAgentConfigStore = defineStore('agentConfig', {
    state: (): AgentConfig => loadConfig(),

    getters: {
        // 未配置 baseUrl 或 model 视为未就绪（F2.4）
        isConfigured: (state): boolean => Boolean(state.baseUrl && state.model)
    },

    actions: {
        updateConfig(partial: Partial<AgentConfig>) {
            Object.assign(this, partial)
            this.persist()
        },

        persist() {
            const config: AgentConfig = {
                baseUrl: this.baseUrl,
                apiKey: this.apiKey,
                model: this.model,
                temperature: this.temperature,
                maxTokens: this.maxTokens
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
        },

        resetConfig() {
            Object.assign(this, DEFAULT_CONFIG)
            localStorage.removeItem(STORAGE_KEY)
        }
    }
})

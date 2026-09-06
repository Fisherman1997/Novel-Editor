import { describe, it, expect } from 'vitest'
import {
  needsMigration,
  migrateData,
  validateMigratedData,
  parseAndMigrate,
  createBackupPath,
  CURRENT_VERSION
} from '../../../src/shared/migration'

describe('migration', () => {
  describe('needsMigration', () => {
    it('应该检测旧版 volume 字段', () => {
      const data = {
        name: '测试',
        volume: []
      }
      expect(needsMigration(data)).toBe(true)
    })

    it('应该检测旧版 character 字段', () => {
      const data = {
        name: '测试',
        character: []
      }
      expect(needsMigration(data)).toBe(true)
    })

    it('应该检测旧版 worldView 字段', () => {
      const data = {
        name: '测试',
        worldView: []
      }
      expect(needsMigration(data)).toBe(true)
    })

    it('应该检测缺少版本号', () => {
      const data = {
        name: '测试',
        volumes: [],
        characters: [],
        worldViews: []
        // 无 _version 字段
      }
      expect(needsMigration(data)).toBe(true)
    })

    it('不需要迁移新版数据', () => {
      const data = {
        name: '测试',
        volumes: [],
        characters: [],
        worldViews: [],
        _version: CURRENT_VERSION
      }
      expect(needsMigration(data)).toBe(false)
    })

    it('空数据不需要迁移', () => {
      expect(needsMigration(null)).toBe(false)
      expect(needsMigration(undefined)).toBe(false)
    })
  })

  describe('migrateData', () => {
    it('应该迁移旧版 volume 格式', () => {
      const oldData = {
        name: '测试小说',
        volume: [
          {
            volumeName: '第一卷',
            volumeSummary: '卷的说明',
            chapterList: [
              {
                chapterName: '第一章',
                chapterSummary: '章的说明',
                list: ['内容1', '内容2']
              }
            ]
          }
        ]
      }

      const migrated = migrateData(oldData)

      expect(migrated.name).toBe('测试小说')
      expect(migrated.volumes).toHaveLength(1)
      expect(migrated.volumes[0].volumeName).toBe('第一卷')
      expect(migrated.volumes[0].volumeSummary).toBe('卷的说明')
      expect(migrated.volumes[0].chapters).toHaveLength(1)
      expect(migrated.volumes[0].chapters[0].chapterName).toBe('第一章')
      expect(migrated.volumes[0].chapters[0].chapterSummary).toBe('章的说明')
      expect(migrated.volumes[0].chapters[0].content).toBe('内容1\n内容2')
    })

    it('应该迁移旧版 character 格式', () => {
      const oldData = {
        name: '测试小说',
        character: [
          {
            name: '张三',
            personality: '勇敢',
            appearance: '高大',
            ageOfAppearance: '20岁',
            content: '详细描述'
          }
        ]
      }

      const migrated = migrateData(oldData)

      expect(migrated.characters).toHaveLength(1)
      expect(migrated.characters[0].name).toBe('张三')
      expect(migrated.characters[0].personality).toBe('勇敢')
      expect(migrated.characters[0].id).toBeDefined()
    })

    it('应该迁移旧版 worldView 格式', () => {
      const oldData = {
        name: '测试小说',
        worldView: [
          {
            name: '魔法系统',
            setting: ['规则1', '规则2'],
            content: '详细描述'
          }
        ]
      }

      const migrated = migrateData(oldData)

      expect(migrated.worldViews).toHaveLength(1)
      expect(migrated.worldViews[0].name).toBe('魔法系统')
      expect(migrated.worldViews[0].settings).toEqual(['规则1', '规则2'])
      expect(migrated.worldViews[0].id).toBeDefined()
    })

    it('应该处理 list 为字符串的情况', () => {
      const oldData = {
        name: '测试小说',
        volume: [
          {
            volumeName: '第一卷',
            chapterList: [
              {
                chapterName: '第一章',
                list: '单行内容'
              }
            ]
          }
        ]
      }

      const migrated = migrateData(oldData)

      expect(migrated.volumes[0].chapters[0].content).toBe('单行内容')
    })

    it('应该添加版本号', () => {
      const oldData = {
        name: '测试小说'
      }

      const migrated = migrateData(oldData)

      expect((migrated as any)._version).toBe(CURRENT_VERSION)
    })
  })

  describe('validateMigratedData', () => {
    it('应该验证有效数据', () => {
      const data = {
        name: '测试小说',
        volumes: [
          {
            volumeName: '第一卷',
            chapters: []
          }
        ],
        characters: [],
        worldViews: []
      }

      const result = validateMigratedData(data)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测无效书名', () => {
      const data = {
        name: '',
        volumes: [],
        characters: [],
        worldViews: []
      }

      const result = validateMigratedData(data)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('书名无效')
    })

    it('应该检测无效卷数据', () => {
      const data = {
        name: '测试',
        volumes: 'not an array',
        characters: [],
        worldViews: []
      } as any

      const result = validateMigratedData(data)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('卷数据无效')
    })

    it('应该检测卷缺少名称', () => {
      const data = {
        name: '测试',
        volumes: [
          {
            volumeName: '',
            chapters: []
          }
        ],
        characters: [],
        worldViews: []
      }

      const result = validateMigratedData(data)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('第 1 卷缺少名称')
    })
  })

  describe('parseAndMigrate', () => {
    it('应该解析并迁移旧版数据', () => {
      const fileContent = JSON.stringify({
        name: '测试小说',
        volume: [
          {
            volumeName: '第一卷',
            chapterList: [
              {
                chapterName: '第一章',
                list: ['内容']
              }
            ]
          }
        ]
      })

      const result = parseAndMigrate(fileContent)

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(true)
      expect(result.data?.name).toBe('测试小说')
      expect(result.data?.volumes).toHaveLength(1)
    })

    it('应该直接返回新版数据', () => {
      const fileContent = JSON.stringify({
        name: '测试小说',
        volumes: [],
        characters: [],
        worldViews: [],
        _version: CURRENT_VERSION
      })

      const result = parseAndMigrate(fileContent)

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(false)
    })

    it('应该处理无效 JSON', () => {
      const fileContent = 'invalid json'

      const result = parseAndMigrate(fileContent)

      expect(result.success).toBe(false)
      expect(result.error).toContain('解析文件失败')
    })
  })

  describe('createBackupPath', () => {
    it('应该生成带时间戳的备份路径', () => {
      const backupPath = createBackupPath('/home/user/novel.xstxt')
      expect(backupPath).toMatch(/\.backup-.+\.xstxt$/)
      expect(backupPath).not.toBe('/home/user/novel.xstxt')
    })

    it('应该处理不区分大小写的扩展名', () => {
      const backupPath = createBackupPath('/home/user/novel.XSTXT')
      expect(backupPath).toMatch(/\.backup-.+\.xstxt$/i)
    })
  })
})

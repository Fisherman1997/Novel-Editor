export type controlWindowType = 'close' | 'show' | 'hide' | 'maximize' | 'minimize' | 'restore'

/**
 * 章节
 */
export type chaptertype = {
    chapterName: string | null
    list: string[] | null
}

/**
 * 册
 */
export type volumetype = {
    volumeName: string | null
    chapterList: chaptertype[]
}

/**
 * 世界观、设定
 */
export type worldViewtype = {
    name: string | null
    setting: string[] | null
    content: string | null
}

/**
 * 人物
 * name： 名字
 * personality: 性格
 * ageOfAppearance； 出现年龄
 * appearance： 长相
 * content： 详细
 */
export type characterType = {
    name: string | null
    personality: string | null
    appearance: string | null
    ageOfAppearance: string | null
    content: string | null
}

// type currentInfotype = {
//     name: string,
//     volume: volumetype[],
//     worldView: worldViewtype[],
//     character: characterType[]
// }

/**
 * 本书
 */
export class CurrentInfo {
    name: string
    volume: volumetype[]
    worldView: worldViewtype[]
    character: characterType[]
    constructor(
        name: string,
        volume?: volumetype[],
        worldView?: worldViewtype[],
        character?: characterType[]
    ) {
        this.name = name
        this.volume = volume || []
        this.worldView = worldView || []
        this.character = character || []
    }
}

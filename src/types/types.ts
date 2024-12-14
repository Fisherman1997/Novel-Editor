export type controlWindowType = 'close' | 'show' | 'hide' | 'maximize' | 'minimize' | 'restore'

// export interface EditableDivInputEvent extends Event {
//     target: HTMLDivElement;
// }


/**
 * 章节
 */
export type chapterType = {
    chapterName: string
    list: string[] | string
}

/**
 * 册
 */
export interface volumeType {
    volumeName: string
    chapterList: chapterType[]
}

/**
 * 世界观、设定
 */
export interface worldViewType {
    name: string
    setting: string[]
    content: string
}

export interface characterType {
    name: string;
    personality: string;
    appearance: string;
    ageOfAppearance: string;
    content: string;
}

/**
 * 本书
 */
export class CurrentInfo {
    name: string
    volume: volumeType[]
    worldView: worldViewType[]
    character: characterType[]
    constructor(
        name: string,
        volume?: volumeType[],
        worldView?: worldViewType[],
        character?: characterType[]
    ) {
        this.name = name
        this.volume = volume || []
        this.worldView = worldView || []
        this.character = character || []
    }
}

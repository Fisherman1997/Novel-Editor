
// 章节
type chaptertype = {
    chapterName: string,
    list: string[]
}

// 册
type volumetype = {
    volumeName: string,
    chapterList: chaptertype[]
}

// 世界观、设定
type worldViewtype = {
    name: string
    setting: string[]
    content: string
}

// 人物
type characterType = {
    name: string,
    personality: string,
    rventOfAppearance: string,
    ageOfAppearance: string,
    content: string
}


// type currentInfotype = {
//     name: string,
//     volume: volumetype[],
//     worldView: worldViewtype[],
//     character: characterType[]
// }

export class CurrentInfo {
    name: string
    volume: volumetype[]
    worldView: worldViewtype[]
    character: characterType[]
    constructor(name: string, volume?: volumetype[], worldView?: worldViewtype[], character?: characterType[]) {
        this.name = name
        this.volume = volume || []
        this.worldView = worldView || []
        this.character = character || []
    }
}

const a = new CurrentInfo('123')
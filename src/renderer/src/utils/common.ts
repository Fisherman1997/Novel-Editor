
/**
 * 
 * @returns 等待渲染后执行后面的程序
 */
export const nextCxecute =  () => {
    return new Promise(resolve => setTimeout(resolve,0))
}


/**
 * 深拷贝
 * @param obj 
 * @returns 
 */
export const deepClone = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj
    }
    const clone: any = Array.isArray(obj) ? [] : {}

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clone[key] = deepClone(obj[key])
        }
    }

    return clone
}
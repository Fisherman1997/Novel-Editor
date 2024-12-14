/**
 *
 * @returns 等待渲染后执行后面的程序
 */
export const nextCxecute = () => {
    return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * 深拷贝
 * @param obj
 * @param map
 * @returns
 */
export const deepClone = (obj: any, map = new WeakMap()): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj
    }

    // 检查是否已经拷贝过该对象
    if (map.has(obj)) {
        return map.get(obj)
    }

    const clone: any = Array.isArray(obj) ? [] : {}
    map.set(obj, clone) // 保存引用，防止循环引用问题

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            clone[key] = deepClone(obj[key], map)
        }
    }

    return clone
}

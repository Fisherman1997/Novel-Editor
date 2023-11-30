
/**
 * 
 * @returns 等待渲染后执行后面的程序
 */
export const nextCxecute =  () => {
    return new Promise(resolve => setTimeout(resolve,0))
}
import { app, BrowserWindow, ipcMain, dialog, OpenDialogOptions, shell } from "electron";
import { writeFile, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from "path";
import { CurrentInfo, controlWindowType } from "../types/types";

export default () => {
    // 通用函数：确保文件夹存在
    const createDirIfNotExist = (dirPath: string) => {
        if (!existsSync(dirPath)) mkdirSync(dirPath)
    }

    // 通用函数：异步写文件并返回 Promise
    const writeFileAsync = (filePath: string, data: string) => {
        return new Promise<boolean>((resolve) => {
            writeFile(filePath, data, 'utf-8', (err) => {
                if (err) resolve(false)
                else resolve(true)
            })
        })
    }

    ipcMain.handle('desktopPath',() => {
        return app.getPath('desktop')
    })

    ipcMain.on('open-file', (_event, filePath: string) => {
        // 使用 shell.openPath 打开指定路径的文件
        shell.openPath(filePath).then((result) => {
            if (result) {
                console.error('Error opening file:', result) // 打开失败时的错误信息
            } else {
                console.log('File opened successfully:', filePath) // 打开成功
            }
        })
    })

    // 处理应用重启
    ipcMain.on('app-relaunch', () => {
        app.relaunch()
    })

    // 创建新窗口
    ipcMain.on('new-window', (_event, url: string) => {
        const win = new BrowserWindow({
            width: 900,
            height: 670,
            show: false,
            autoHideMenuBar: true,
            icon: join(__dirname, '../../resources/icon.png'),
            webPreferences: {
                sandbox: false
            }
        })
        win.loadURL(url).then()
        win.once('ready-to-show', () => win.show())
    })

    // 控制窗口的显示、隐藏、最大化、最小化等
    const controlWindow = (action: controlWindowType) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) {
            switch (action) {
                case 'close':
                    win.close()
                    break
                case 'show':
                    win.show()
                    break
                case 'hide':
                    win.hide()
                    break
                case 'restore':
                    win.restore()
                    break
                case 'maximize':
                    win.maximize()
                    break
                case 'minimize':
                    win.minimize()
                    break
            }
        }
    }

    ipcMain.on('close', () => controlWindow('close'))
    ipcMain.on('show', () => controlWindow('show'))
    ipcMain.on('hide', () => controlWindow('hide'))
    ipcMain.on('restore', () => controlWindow('restore'))
    ipcMain.on('maximize', () => controlWindow('maximize'))
    ipcMain.on('minimize', () => controlWindow('minimize'))

    // 选择文件或目录
    ipcMain.handle('read-file-path-main',  async (_event, defaultPath: string, type: 'dir' | 'file') => {
        console.log('read-file-path-main', defaultPath, type)
        const win = BrowserWindow.getFocusedWindow()
        const element: OpenDialogOptions = {
            title: '选择路径',
            defaultPath,
            properties: type === 'dir' ? ['openDirectory'] : [],
            filters: type === 'file' ? [{ name: 'Text Files', extensions: ['xstxt'] }] : []
        }

        return await new Promise((resolve,reject) => {
            dialog.showOpenDialog(win!, element).then((result): void => {
                if (!result.filePaths[0]) return void reject("没有")
                if (type === 'file' && result.filePaths[0].split('.').pop() !== 'xstxt') {
                    dialog.showErrorBox('提示', '格式错误')
                } else {
                    resolve(result.filePaths[0]);
                }
            })
        })
    })

    // 读取文件
    ipcMain.handle('read-file-main', (_event, filePath: string): string | null => {
        try {
            return readFileSync(filePath, 'utf-8')
        } catch {
            dialog.showErrorBox('提示', '读取失败，请重新选择路径')
            return null
        }
    })


    // 保存文件
    ipcMain.handle('save-file-main', async (_event, filePath: string | string[], data: string): Promise<boolean> => {
        if ((<string>filePath).split('.').pop() !== 'xstxt') return false
        return await writeFileAsync(<string>filePath, data)
    })



    // 导出数据
    interface ExportProps {
        type: 'all' | 'volume' | 'chapter'
        path: string
        data: CurrentInfo
    }

    ipcMain.on('export', async (event, { data, type, path }: ExportProps) => {
        try {
            const baseDir = join(path, data.name)

            // 创建目录
            createDirIfNotExist(baseDir)
            createDirIfNotExist(join(baseDir, '设定'))
            createDirIfNotExist(join(baseDir, '人物'))

            // 处理人物、世界观、卷和章节
            const exportPromises: Promise<boolean>[] = []

            if (type === 'all' || type === 'volume') {
                // 人物
                data.character.forEach((item) => {
                    const content = `姓名：${item.name}\n性格：${item.personality}\n长相：${item.appearance}\n出现年龄：${item.ageOfAppearance}\n详细：${item.content}`
                    exportPromises.push(
                        writeFileAsync(join(baseDir, '人物', item.name) + '.txt', content)
                    )
                })

                // 世界观
                data.worldView.forEach((item) => {
                    exportPromises.push(
                        writeFileAsync(join(baseDir, '设定', item.name) + '.txt', item.content)
                    )
                })

                // 卷和章节
                data.volume.forEach((item) => {
                    const volumePath = join(baseDir, item.volumeName)
                    createDirIfNotExist(volumePath)
                    item.chapterList.forEach((cItem) => {
                        exportPromises.push(
                            writeFileAsync(
                                join(volumePath, cItem.chapterName) + '.txt',
                                cItem.list as string
                            )
                        )
                    })
                })
            }

            if (type === 'chapter') {
                data.character.forEach((cItem) => {
                    exportPromises.push(
                        writeFileAsync(join(path, cItem.name) + '.txt', JSON.stringify(cItem))
                    )
                })
            }

            // 等待所有文件操作完成
            const results = await Promise.all(exportPromises)
            const success = results.every((result) => result)

            event.reply('export-result', success)
        } catch (error) {
            console.error(error)
            event.reply('export-result', false)
        }
    })
}

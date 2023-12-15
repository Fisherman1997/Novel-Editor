import { app, BrowserWindow, ipcMain, dialog, OpenDialogOptions } from "electron"
import { writeFile, readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'


export default () => {
	ipcMain.on('app-relaunch', () => {
		app.relaunch()
	})
	ipcMain.on('new-window', (event, url) => {
		event = event || event
		const win = new BrowserWindow({
		width: 900,
		height: 670,
		show: false,
		autoHideMenuBar: true,
		icon: join(__dirname,'../../resources/icon.png'),
		webPreferences: {
			sandbox: false,
		}
		})  
		win.loadURL(url)  
		win.on('ready-to-show', () => { win.show() })
	})
	
	ipcMain.on('close',() => {
		const win = BrowserWindow.getFocusedWindow()
		win?.close()
	})
	
	ipcMain.on('show',() => {
		const win = BrowserWindow.getFocusedWindow()
		win?.show()
	})
	
	ipcMain.on('hide',() => {
		const win = BrowserWindow.getFocusedWindow()
		win?.hide()
	})
	
	ipcMain.on('restore',() => {
		const win = BrowserWindow.getFocusedWindow()
		win?.restore()
	})
	
	ipcMain.on('maximize',() => {
		const win = BrowserWindow.getFocusedWindow()
		win?.maximize()
	})
	
	ipcMain.on('minimize',() => {
		const win = BrowserWindow.getFocusedWindow()
		win?.minimize()
	})
	
	// // 选择文件  
	ipcMain.on('read-file-path-main', (event, defaultPath: string, type: 'dir' | 'file') => {
		const win = BrowserWindow.getFocusedWindow()
		const element: OpenDialogOptions = {
			title: '选择路径',
			defaultPath
		}
		if (type === 'dir') element.properties = ['openDirectory']
		if (type === 'file') element.filters = [ { name: 'Text Files', extensions: ['xstxt'] }]
		dialog.showOpenDialog( win!, element).then(result => {
			if (type === 'dir') return event.reply('read-file-path',result.filePaths[0], type)
			const err = result.filePaths[0]?.split('.')
			if(!result.filePaths[0]) return
			if (err![err?.length - 1 as number] !== 'xstxt') dialog.showErrorBox('提示','格式错误')
			else event.reply('read-file-path',result.filePaths[0], type)
		})
	});  

	ipcMain.on('save-file-main', (event, filePath: string | string[], data: string) => {
		filePath = (<string>filePath).split('.')
		if (filePath![filePath?.length - 1] !== 'xstxt') return
		filePath = (<string[]>filePath).join('.')
		writeFile(<string>filePath, data , 'utf-8' ,(err) => {
			if (err) event.reply('save-file',false)
			else event.reply('save-file',true)
		})
	});

	ipcMain.on('read-file-main', (event, filePath: string) => {
		try{
			const result = readFileSync(filePath, 'utf-8')
			event.reply('read-file',result)
		} catch{
			dialog.showErrorBox('提示','新增失败请重新选择路径')
		}
	});
	interface exportProps {
		type: 'all' | 'volume' | 'chapter',
		path: string,
		data: any 
	}
	ipcMain.on('export', async (event, {data, type, path}:exportProps) => {
		if (type === 'all') {
			try{
				if (!existsSync(join(path, data.name))) mkdirSync(join(path, data.name))
				if (!existsSync(join(path, data.name, '设定'))) mkdirSync(join(path, data.name, '设定'))
				if (!existsSync(join(path, data.name, '人物'))) mkdirSync(join(path, data.name, '人物'))
				data.character.forEach(async itme => {
					const result = ` 姓名：${itme.name}\n性格：${itme.personality}\n长相：${itme.appearance}\n出现年龄：${itme.ageOfAppearance}\n详细：${itme.content}
					`
					writeFileSync(join(path, data.name, '人物', itme.name) + '.txt', result)
					await new Promise(resolve => setTimeout(resolve))
				})
				data.worldView.forEach(async itme => {
					writeFileSync(join(path, data.name, '设定', itme.name) + '.txt', itme.content)
					await new Promise(resolve => setTimeout(resolve))
				})
				data.volume.forEach(async itme => {
					if (!existsSync(join(path, data.name, itme.volumeName))) mkdirSync(join(path, data.name, itme.volumeName))
					itme.chapterList.forEach(async citme => {
						writeFileSync(join(path, data.name, itme.volumeName, citme.chapterName) + '.txt', citme.list)
						await new Promise(resolve => setTimeout(resolve))
					})
					await new Promise(resolve => setTimeout(resolve))
				})
				await new Promise(resolve => setTimeout(resolve))
				event.reply('export-result', true)
			} catch {
				event.reply('export-result', false)
			}
		} else if (type === 'volume') {
			try{
				data.volume.forEach(async itme => {
					if (!existsSync(join(path, itme.volumeName))) mkdirSync(join(path, itme.volumeName))
					itme.chapterList.forEach(async citme => {
						writeFileSync(join(path, itme.volumeName, citme.chapterName) + '.txt', citme.list)
						await new Promise(resolve => setTimeout(resolve))
					})
					await new Promise(resolve => setTimeout(resolve))
				})
				await new Promise(resolve => setTimeout(resolve))
				event.reply('export-result', true)
			} catch {
				event.reply('export-result', false)
			}
		} else if (type === 'chapter') {
			try{
				data.forEach(async citme => {
					writeFileSync(join(path, citme.chapterName) + '.txt', citme.list)
					await new Promise(resolve => setTimeout(resolve))
				})
				await new Promise(resolve => setTimeout(resolve))
				event.reply('export-result', true)
			} catch {
				event.reply('export-result', false)
			}
		}
	})
}
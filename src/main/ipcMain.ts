import { BrowserWindow, ipcMain, dialog } from "electron"
import { writeFile, readFileSync } from 'fs'
import { join } from 'path'

export default () => {
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
	
	// // 监听保存文件事件  
	ipcMain.on('read-file-path-main', (event, defaultPath) => {
		const win = BrowserWindow.getFocusedWindow()
		dialog.showSaveDialog( win!, {
			title: '选择路径',
			defaultPath
		}).then(result => {
			event.reply('get-file-path',result.filePath)
		})
	});  

	ipcMain.on('save-file-main', (event, filePath: string, data: string) => {
		writeFile(filePath, btoa(data),(err) => {
			if (err) event.reply('save-file',false)
			else event.reply('save-file',true)
		})
	});

	ipcMain.on('read-file-main', (event, filePath: string) => {
		try{
			const result =  readFileSync(filePath)
			event.reply('read-file', atob(result as any))
		} catch{
			dialog.showErrorBox('提示','新增失败请重新选择路径')
		}
	});
}
import { BrowserWindow, ipcMain } from "electron"
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
	ipcMain.on('isFullScreen',() => {
		const win = BrowserWindow.getFocusedWindow()
		return win?.isFullScreen()
	})
}
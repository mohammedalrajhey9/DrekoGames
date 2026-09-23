const { autoUpdater } = require('electron-updater')
const { dialog } = require('electron')

let updateState = {
  checking: false,
  available: false,
  downloaded: false,
  version: '',
  error: '',
}

const setUpdateState = (next) => {
  updateState = { ...updateState, ...next }
}

const sendStatus = (mainWindow) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('app-update-status', {
      ...updateState,
      checking: Boolean(updateState.checking),
      available: Boolean(updateState.available),
      downloaded: Boolean(updateState.downloaded),
    })
  } catch {}
}

const setupAutoUpdater = (mainWindow) => {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.disableWebInstaller = false
  autoUpdater.forceDevUpdateConfig = false

  autoUpdater.on('checking-for-update', () => {
    setUpdateState({ checking: true, available: false, downloaded: false, error: '' })
    sendStatus(mainWindow)
  })

  autoUpdater.on('update-available', (info) => {
    setUpdateState({ checking: false, available: true, downloaded: false, version: info?.version || '', error: '' })
    sendStatus(mainWindow)
  })

  autoUpdater.on('update-not-available', () => {
    setUpdateState({ checking: false, available: false, downloaded: false, version: '', error: '' })
    sendStatus(mainWindow)
  })

  autoUpdater.on('error', (error) => {
    setUpdateState({ checking: false, available: false, downloaded: false, error: error?.message || 'Update check failed' })
    sendStatus(mainWindow)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) return
      mainWindow.webContents.send('app-update-progress', {
        percent: Number(progressObj.percent || 0),
        transferred: Number(progressObj.transferred || 0),
        total: Number(progressObj.total || 0),
        bytesPerSecond: Number(progressObj.bytesPerSecond || 0),
      })
    } catch {}
  })

  autoUpdater.on('update-downloaded', () => {
    setUpdateState({ checking: false, available: true, downloaded: true, error: '' })
    sendStatus(mainWindow)

    try {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update ready',
        message: 'A new Dreko Games update has been downloaded and will be installed when you restart the app.',
        buttons: ['Restart Now', 'Later'],
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true)
        }
      }).catch(() => {})
    } catch {}
  })

  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    setUpdateState({ checking: false, available: false, downloaded: false, error: error?.message || 'Update check failed' })
    sendStatus(mainWindow)
  })
}

module.exports = { setupAutoUpdater, getUpdateState: () => updateState }

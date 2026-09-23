// Use dynamic import in a safe async wrapper so preload executes under different module modes
(async () => {
  try {
    console.log('[preload] preload.js executing')
  } catch {}

  try {
    let contextBridge, ipcRenderer
    if (typeof require === 'function') {
      try {
        ({ contextBridge, ipcRenderer } = require('electron'))
      } catch (e) {
        // fallthrough to dynamic import
      }
    }

    if (!contextBridge || !ipcRenderer) {
      ({ contextBridge, ipcRenderer } = await import('electron'))
    }

    contextBridge.exposeInMainWorld('electronAPI', {
      downloadGame: (payload) => ipcRenderer.invoke('download-game', payload),
      cancelDownload: (payload) => ipcRenderer.invoke('cancel-download', payload),
      pauseDownload: (payload) => ipcRenderer.invoke('pause-download', payload),
      resumeDownload: (payload) => ipcRenderer.invoke('resume-download', payload),
      selectDownloadFolder: () => ipcRenderer.invoke('select-download-folder'),
      createDesktopShortcut: (payload) => ipcRenderer.invoke('create-desktop-shortcut', payload),
      openPath: (payload) => ipcRenderer.invoke('open-path', payload),
      openExternal: (url) => ipcRenderer.invoke('open-external', url),
      measureDownloadSpeed: (payload) => ipcRenderer.invoke('measure-download-speed', payload),
      startGoogleOAuth: (params) => ipcRenderer.invoke('start-google-oauth', params),
      checkPathExists: (payload) => ipcRenderer.invoke('check-path-exists', payload),
      uninstallGame: (payload) => ipcRenderer.invoke('uninstall-game', payload),
      setMinimizeToTray: (enabled) => ipcRenderer.invoke('set-minimize-to-tray', enabled),
      setRunOnStartup: (enabled) => ipcRenderer.invoke('set-run-on-startup', enabled),
      getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
      checkForAppUpdates: () => ipcRenderer.invoke('check-for-app-updates'),
      minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
      maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
      closeWindow: () => ipcRenderer.invoke('close-window'),
      onDownloadProgress: (callback) => {
        const listener = (_event, payload) => callback(payload)
        ipcRenderer.on('download-progress', listener)
        return () => ipcRenderer.removeListener('download-progress', listener)
      },
      onAppUpdateStatus: (callback) => {
        const listener = (_event, payload) => callback(payload)
        ipcRenderer.on('app-update-status', listener)
        return () => ipcRenderer.removeListener('app-update-status', listener)
      },
      onAppUpdateProgress: (callback) => {
        const listener = (_event, payload) => callback(payload)
        ipcRenderer.on('app-update-progress', listener)
        return () => ipcRenderer.removeListener('app-update-progress', listener)
      },
    })

    try {
      ipcRenderer.send('preload-ready')
    } catch {}
  } catch (err) {
    try { console.error('[preload] failed to initialize preload bridge', err) } catch {}
  }
})()

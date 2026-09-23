const { app, BrowserWindow, dialog, ipcMain, Menu, shell, Tray } = require('electron')
const path = require('path')
const fs = require('fs')
const { execFile } = require('child_process')
const { finished } = require('stream').promises
const { setupAutoUpdater, getUpdateState } = require('./updater.cjs')

const distIndexPath = path.join(__dirname, '../dist/index.html')
const hasBuiltApp = fs.existsSync(distIndexPath)
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development'
try { console.log('[main] main.js loaded, isDev=', isDev, 'hasBuiltApp=', hasBuiltApp) } catch {}

const resolveAppResourcePath = (...segments) => {
  const candidates = [
    path.join(process.resourcesPath, ...segments),
    path.join(app.getAppPath(), ...segments),
    path.join(__dirname, ...segments),
    path.join(__dirname, '..', ...segments),
  ]

  return candidates.find((target) => fs.existsSync(target)) || candidates[0]
}

const appIcon = resolveAppResourcePath('assets', 'icon.ico')
const fallbackAppIcon = resolveAppResourcePath('assets', 'dreko-logo.svg')
const activeDownloads = new Map()
const appSettingsPath = path.join(app.getPath('userData'), 'dreko-settings.json')
app.setName('Dreko Games Launcher')
app.setAppUserModelId('com.drekogames.launcher')
let mainWindow = null
let tray = null
let minimizeToTrayEnabled = true
let runOnStartupEnabled = false

const loadPersistedSettings = () => {
  try {
    if (!fs.existsSync(appSettingsPath)) {
      return { minimizeToTray: true, runOnStartup: false }
    }

    const raw = fs.readFileSync(appSettingsPath, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      minimizeToTray: parsed && typeof parsed.minimizeToTray === 'boolean' ? parsed.minimizeToTray : true,
      runOnStartup: parsed && typeof parsed.runOnStartup === 'boolean' ? parsed.runOnStartup : false,
    }
  } catch {
    return { minimizeToTray: true, runOnStartup: false }
  }
}

const persistSettings = (nextSettings = {}) => {
  try {
    const current = loadPersistedSettings()
    const merged = { ...current, ...nextSettings }
    fs.writeFileSync(appSettingsPath, JSON.stringify({
      minimizeToTray: !!merged.minimizeToTray,
      runOnStartup: !!merged.runOnStartup,
    }, null, 2))
    return merged
  } catch {
    return { minimizeToTray: minimizeToTrayEnabled, runOnStartup: runOnStartupEnabled }
  }
}

const applySavedSettings = () => {
  const saved = loadPersistedSettings()
  minimizeToTrayEnabled = !!saved.minimizeToTray
  runOnStartupEnabled = !!saved.runOnStartup
  applyStartupSetting(runOnStartupEnabled)
  if (mainWindow) {
    if (minimizeToTrayEnabled) {
      createTrayIcon()
    } else if (tray) {
      tray.destroy(); tray = null
    }
  }
}

const applyStartupSetting = (enabled) => {
  runOnStartupEnabled = !!enabled
  try {
    app.setLoginItemSettings({ openAtLogin: runOnStartupEnabled, args: ['--hidden'] })
  } catch {
    // Some build modes do not support login-item settings.
  }
}

const restoreMainWindow = () => {
  if (!mainWindow) {
    return
  }

  try {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    if (!mainWindow.isVisible()) {
      mainWindow.show()
    }

    mainWindow.setSkipTaskbar(false)
    mainWindow.show()
    mainWindow.focus({ steal: true })

    if (mainWindow.isMinimized()) {
      setTimeout(() => {
        if (!mainWindow) {
          return
        }
        mainWindow.restore()
        mainWindow.show()
        mainWindow.focus({ steal: true })
      }, 80)
    }
  } catch {
    // Ignore rare window-state transition issues while restoring from tray.
  }
}

const syncTrayVisibility = () => {
  if (!mainWindow) {
    return
  }

  if (!minimizeToTrayEnabled) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.hide()
  }
}

const createTrayIcon = () => {
  if (tray || !mainWindow) {
    return
  }

  const trayIconPath = fs.existsSync(appIcon) ? appIcon : fallbackAppIcon

  try {
    tray = new Tray(trayIconPath)
    tray.setToolTip('Dreko Games')

    const trayMenu = Menu.buildFromTemplate([
      {
        label: 'Open Dreko Games',
        click: () => {
          restoreMainWindow()
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true
          if (tray) {
            tray.destroy()
            tray = null
          }
          app.quit()
        },
      },
    ])

    tray.setContextMenu(trayMenu)
    tray.setIgnoreDoubleClickEvents(false)
    tray.on('click', () => {
      restoreMainWindow()
    })
    tray.on('double-click', () => {
      restoreMainWindow()
    })
  } catch {
    tray = null
  }
}

// listen for preload ready signal
try {
  ipcMain.on('preload-ready', (event) => {
    try { console.log('[main] received preload-ready from renderer webContents id=', event.sender.id) } catch {}
  })
} catch {}


ipcMain.handle('select-download-folder', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose where to install this game',
    properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
    defaultPath: path.join(app.getPath('downloads'), 'DrekoGames'),
  })

  if (result.canceled || result.filePaths.length === 0) {
    return ''
  }

  return result.filePaths[0]
})

ipcMain.handle('measure-download-speed', async (_, { url }) => {
  if (!url) {
    throw new Error('Speed test URL is missing.')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)

  try {
    const startedAt = Date.now()
    let bytesReceived = 0
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: '*/*',
      },
      signal: controller.signal,
    })

    if (!response.ok || !response.body) {
      throw new Error('The speed test source did not respond correctly.')
    }

    const reader = response.body.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (value) {
        bytesReceived += value.byteLength
      }
    }

    const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.1)
    const megabytesPerSecond = (bytesReceived / (1024 * 1024)) / elapsedSeconds

    return {
      bytes: bytesReceived,
      mbps: Number(megabytesPerSecond.toFixed(2)),
      kbps: Number(((bytesReceived / 1024) / elapsedSeconds).toFixed(1)),
      label: `${megabytesPerSecond.toFixed(2)} MB/s`,
    }
  } finally {
    clearTimeout(timer)
  }
})

ipcMain.handle('check-path-exists', async (_, { path: targetPath }) => {
  if (!targetPath) {
    return false
  }

  try {
    return fs.existsSync(targetPath)
  } catch {
    return false
  }
})

ipcMain.handle('uninstall-game', async (_, { path: targetPath }) => {
  if (!targetPath) {
    return false
  }

  try {
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true })
      return true
    }

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath)
      return true
    }

    return true
  } catch {
    return false
  }
})

const createDesktopShortcutFile = async ({ targetPath, name }) => {
  if (process.platform !== 'win32') {
    return true
  }

  if (!targetPath || !name) {
    return false
  }

  const desktopPath = app.getPath('desktop')
  const shortcutPath = path.join(desktopPath, `${name}.lnk`)
  const target = targetPath.replace(/'/g, "''")
  const shortcut = shortcutPath.replace(/'/g, "''")

  return await new Promise((resolve) => {
    execFile(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `"$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('${shortcut}'); $Shortcut.TargetPath = '${target}'; $Shortcut.Save();"`,
      ],
      (error) => {
        resolve(!error && fs.existsSync(shortcutPath))
      },
    )
  })
}

ipcMain.handle('create-desktop-shortcut', async (_, { targetPath, name }) => createDesktopShortcutFile({ targetPath, name }))

ipcMain.handle('start-google-oauth', async (_, { clientId, clientSecret } = {}) => {
  // If renderer did not provide clientId / clientSecret, try to read from local secrets.
  try {
    if (!clientId) {
      const candidates = [
        path.join(app.getPath('userData'), 'google-oauth.json'),
        path.join(__dirname, '../secrets/google-oauth.json'),
      ]
      for (const candidate of candidates) {
        try {
          if (fs.existsSync(candidate)) {
            const raw = fs.readFileSync(candidate, 'utf8')
            const parsed = JSON.parse(raw || '{}')
            clientId = clientId || parsed.clientId || parsed.client_id || ''
            clientSecret = clientSecret || parsed.clientSecret || parsed.client_secret || ''
            if (clientId) break
          }
        } catch (e) {
          // ignore parse/read errors and continue
        }
      }
    }
  } catch (e) {}

  if (!clientId) {
    throw new Error('Missing Google OAuth client_id')
  }

  const http = require('http')
  const url = require('url')

  return await new Promise((resolve, reject) => {
    let server
    let finished = false
    const cleanup = () => {
      try { server && server.close() } catch {}
    }

    // Generate PKCE verifier and challenge
    const crypto = require('crypto')
    const base64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const codeVerifier = base64url(crypto.randomBytes(64))
    const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest())

    server = http.createServer(async (req, res) => {
      try {
        const parsed = url.parse(req.url || '', true)
        const pathname = parsed?.pathname || '/' 
        console.log('[oauth] incoming request', { url: req.url, pathname })

        // Ignore non-callback requests (favicon, health checks, etc.)
        if (pathname !== '/callback') {
          try {
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('OK')
          } catch {}
          return
        }

        const code = String(parsed.query.code || '')
        const state = String(parsed.query.state || '')

        // Respond to the browser indicating the flow completed
        try {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<html><body><h2>You can now return to the app. You may close this window.</h2></body></html>')
        } catch {}

        if (!code) {
          // If the callback arrived but no code present, surface a clear error
          if (!finished) { finished = true; cleanup(); reject(new Error('No code received in /callback')) }
          return
        }

        // exchange code for tokens using PKCE (no client_secret for installed apps)
        try {
          const redirectUri = `http://127.0.0.1:${server.address().port}/callback`
          console.log('[oauth] exchanging code for tokens', { code: code.slice(0, 8) + '...' })

          const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
              code_verifier: codeVerifier,
            }),
          })

          const tokenData = await tokenResp.json()
          console.log('[oauth] token response', tokenData && (tokenData.error ? { error: tokenData.error } : { has_id_token: !!tokenData.id_token }))

          if (tokenData.error) {
            if (!finished) { finished = true; cleanup(); reject(new Error(JSON.stringify(tokenData))) }
            return
          }

          const id_token = tokenData.id_token
          const access_token = tokenData.access_token

          if (!finished) { finished = true; cleanup(); resolve({ id_token, access_token, tokenData }) }
        } catch (err) {
          if (!finished) { finished = true; cleanup(); reject(err) }
        }
      } catch (err) {
        try { res.writeHead(500); res.end('Server error') } catch {}
        if (!finished) { finished = true; cleanup(); reject(err) }
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      const redirectUri = `http://127.0.0.1:${port}/callback`
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', 'openid email profile')
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'select_account')

      // include PKCE challenge
      try {
        if (typeof codeChallenge !== 'undefined') {
          authUrl.searchParams.set('code_challenge', codeChallenge)
          authUrl.searchParams.set('code_challenge_method', 'S256')
        }
      } catch (e) {}

      try {
        console.log('[oauth] opening browser', { authUrl: authUrl.toString().slice(0, 200) })
        // avoid logging the full URL with sensitive params
        shell.openExternal(authUrl.toString())
      } catch (e) {
        if (!finished) { finished = true; cleanup(); reject(e) }
      }

      // safety timeout
      setTimeout(() => {
        if (!finished) { finished = true; cleanup(); reject(new Error('OAuth timed out')) }
      }, 120000)
    })
  })
})

ipcMain.handle('download-game', async (_, { url, fileName, installDir, createShortcut, shortcutName, gameId }) => {
  if (!url || !fileName) {
    throw new Error('This game is not available right now.')
  }

  const defaultTargetDir = 'C:\\DrekoGames'
  let targetDir = installDir || defaultTargetDir

  try {
    fs.mkdirSync(targetDir, { recursive: true })
  } catch {
    targetDir = defaultTargetDir
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const targetPath = path.join(targetDir, fileName)

  const emitProgress = ({ percent, downloaded, total, speed, eta, active = true, paused = false }) => {
    BrowserWindow.getAllWindows().forEach((browserWindow) => {
      browserWindow.webContents.send('download-progress', {
        gameId,
        percent,
        downloaded,
        total,
        speed,
        eta,
        active,
        paused,
      })
    })
  }

  const controller = new AbortController()
  const current = {
    cancelled: false,
    controller,
    targetPath,
    paused: false,
    resumeResolver: null,
    requests: [],
    total: 0,
    downloaded: 0,
    file: null,
  }
  activeDownloads.set(gameId, current)

  try {
    const headResponse = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: '*/*',
      },
      signal: controller.signal,
    }).catch(() => null)

    const totalBytes = Number((headResponse && headResponse.headers.get('content-length')) || 0)
    const acceptRanges = (headResponse?.headers.get('accept-ranges') || '').toLowerCase().includes('bytes') || (headResponse?.headers.get('accept-ranges') || '').toLowerCase().includes('none') === false
    try { console.log('[main] download headers:', { url, acceptRanges, contentLength: totalBytes, acceptRangesRaw: headResponse?.headers.get('accept-ranges') || 'unknown' }) } catch {}

    const waitForResume = async () => {
      if (!current.paused) {
        return
      }

      await new Promise((resolve) => {
        current.resumeResolver = resolve
      })
      current.resumeResolver = null
      if (current.cancelled) {
        return undefined
      }
    }

    const directStreamDownload = async () => {
      const totalBytesForTransfer = totalBytes > 0 ? totalBytes : 0
      let receivedOverall = 0
      let lastTimestamp = Date.now()
      let lastDownloadedBytes = 0

      const singleResponse = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
        signal: controller.signal,
      })

      if (!singleResponse.ok) {
        throw new Error('This game is not available right now.')
      }

      if (!singleResponse.body) {
        throw new Error('This game is not available right now.')
      }

      const fileStream = fs.createWriteStream(targetPath)
      current.file = fileStream
      current.total = totalBytesForTransfer
      current.downloaded = 0
      const reader = singleResponse.body.getReader()

      try {
        while (true) {
          if (current.cancelled) {
            try { await reader.cancel() } catch {}
            break
          }

          await waitForResume()
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          if (value) {
            if (current.cancelled || fileStream.destroyed || !fileStream.writable) {
              try { await reader.cancel() } catch {}
              break
            }

            fileStream.write(Buffer.from(value))
            receivedOverall += value.length
            current.downloaded = receivedOverall
            current.total = totalBytesForTransfer

            const now = Date.now()
            const elapsedMs = Math.max(now - lastTimestamp, 100)
            const speed = (receivedOverall - lastDownloadedBytes) * 1000 / elapsedMs
            const percent = totalBytesForTransfer > 0 ? (receivedOverall / totalBytesForTransfer) * 100 : 0
            const remaining = totalBytesForTransfer > 0 ? Math.max(totalBytesForTransfer - receivedOverall, 0) : 0
            const eta = speed > 0 ? remaining / speed : 0

            emitProgress({
              percent: Number(percent.toFixed(1)),
              downloaded: receivedOverall,
              total: totalBytesForTransfer,
              speed,
              eta,
              active: true,
              paused: current.paused,
            })

            lastDownloadedBytes = receivedOverall
            lastTimestamp = now
          }
        }
      } finally {
        try { fileStream.end() } catch {}
      }

      return receivedOverall
    }

    const parallelRangeDownload = async () => {
      const totalBytesForTransfer = totalBytes > 0 ? totalBytes : 0
      if (!acceptRanges || totalBytesForTransfer <= 0 || totalBytesForTransfer < 2 * 1024 * 1024) {
        return directStreamDownload()
      }

      const chunkCount = Math.min(6, Math.max(2, Math.floor(totalBytesForTransfer / (512 * 1024))))
      const partDir = path.join(targetDir, `.${path.basename(fileName)}.parts-${Date.now()}`)
      fs.mkdirSync(partDir, { recursive: true })

      let receivedOverall = 0
      let lastTimestamp = Date.now()
      let lastDownloadedBytes = 0

      const partPaths = []
      const partSize = Math.ceil(totalBytesForTransfer / chunkCount)

      const worker = async (index, startByte, endByte) => {
        const partPath = path.join(partDir, `part-${index}.bin`)
        partPaths.push(partPath)

        const partController = new AbortController()
        current.requests.push(partController)

        try {
          const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: {
              Range: `bytes=${startByte}-${endByte}`,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              Accept: '*/*',
            },
            signal: partController.signal,
          })

          if (!response.ok && response.status !== 206) {
            throw new Error(`Range request failed: ${response.status}`)
          }

          if (!response.body) {
            throw new Error('This game is not available right now.')
          }

          const writer = fs.createWriteStream(partPath)
          const reader = response.body.getReader()
          let partDownloaded = 0

          while (true) {
            if (current.cancelled) {
              try { await reader.cancel() } catch {}
              try { writer.destroy() } catch {}
              return 0
            }

            await waitForResume()
            const { done, value } = await reader.read()
            if (done) {
              break
            }

            if (value) {
              if (current.cancelled || writer.destroyed || !writer.writable) {
                try { await reader.cancel() } catch {}
                return 0
              }

              writer.write(Buffer.from(value))
              partDownloaded += value.length
              receivedOverall += value.length
              current.downloaded = receivedOverall
              current.total = totalBytesForTransfer

              const now = Date.now()
              const elapsedMs = Math.max(now - lastTimestamp, 100)
              const speed = (receivedOverall - lastDownloadedBytes) * 1000 / elapsedMs
              const percent = totalBytesForTransfer > 0 ? (receivedOverall / totalBytesForTransfer) * 100 : 0
              const remaining = totalBytesForTransfer > 0 ? Math.max(totalBytesForTransfer - receivedOverall, 0) : 0
              const eta = speed > 0 ? remaining / speed : 0

              emitProgress({
                percent: Number(percent.toFixed(1)),
                downloaded: receivedOverall,
                total: totalBytesForTransfer,
                speed,
                eta,
                active: true,
                paused: current.paused,
              })

              lastDownloadedBytes = receivedOverall
              lastTimestamp = now
            }
          }

          await new Promise((resolve, reject) => {
            writer.end((error) => error ? reject(error) : resolve())
          })
          return partDownloaded
        } finally {
          current.requests = current.requests.filter((entry) => entry !== partController)
        }
      }

      const tasks = []
      for (let index = 0; index < chunkCount; index += 1) {
        const startByte = index * partSize
        const endByte = index === chunkCount - 1 ? totalBytesForTransfer - 1 : (index + 1) * partSize - 1
        if (startByte >= totalBytesForTransfer) {
          break
        }
        tasks.push(worker(index, startByte, endByte))
      }

      const results = await Promise.all(tasks)

      const finalWriter = fs.createWriteStream(targetPath)
      for (const partPath of partPaths) {
        const data = fs.readFileSync(partPath)
        finalWriter.write(data)
        fs.unlinkSync(partPath)
      }

      await new Promise((resolve, reject) => {
        finalWriter.end((error) => error ? reject(error) : resolve())
      })

      try {
        fs.rmSync(partDir, { recursive: true, force: true })
      } catch {}

      return results.reduce((sum, value) => sum + value, 0)
    }

    const downloaded = await parallelRangeDownload()

    if (current.cancelled) {
      return ''
    }

    if (!fs.existsSync(targetPath)) {
      throw new Error('Download did not finish correctly.')
    }

    if (createShortcut && shortcutName) {
      const shortcutCreated = await createDesktopShortcutFile({ targetPath, name: shortcutName })
      if (!shortcutCreated) {
        console.warn('Desktop shortcut was not created.')
      }
    }

    const finalTotal = totalBytes > 0 ? totalBytes : downloaded || 1
    emitProgress({
      percent: 100,
      downloaded: finalTotal,
      total: finalTotal,
      speed: 0,
      eta: 0,
      active: false,
      paused: false,
    })

    activeDownloads.delete(gameId)
    return targetPath
  } catch (error) {
    if (current.cancelled) {
      activeDownloads.delete(gameId)
      BrowserWindow.getAllWindows().forEach((browserWindow) => {
        browserWindow.webContents.send('download-progress', {
          gameId,
          percent: 0,
          downloaded: 0,
          total: 0,
          speed: 0,
          eta: 0,
          active: false,
          paused: false,
        })
      })
      return ''
    }

    try {
      fs.unlinkSync(targetPath)
    } catch {
      // ignore
    }
    activeDownloads.delete(gameId)
    throw error instanceof Error ? error : new Error('This game is not available right now.')
  }
})

ipcMain.handle('cancel-download', async (_, { gameId }) => {
  const activeDownload = activeDownloads.get(gameId)

  if (!activeDownload) {
    return false
  }

  activeDownload.cancelled = true
  if (activeDownload.controller) {
    try {
      activeDownload.controller.abort()
    } catch {
      // ignore
    }
  }
  if (activeDownload.file && !activeDownload.file.destroyed) {
    try {
      activeDownload.file.destroy()
    } catch {
      // ignore
    }
  }

  try {
    if (activeDownload.resumeResolver) {
      try { activeDownload.resumeResolver() } catch {}
    }
  } catch {}

  const filePath = activeDownload.targetPath || activeDownload.file?.path
  if (filePath) {
    try {
      // User cancellation should only remove the UI record and stop the transfer.
      // Do not delete the file itself from disk.
    } catch {
      // ignore
    }
  }

  try {
    const logPath = path.join(app.getPath('userData'), 'download-cancel.log')
    const message = `${new Date().toISOString()} CANCELLED gameId=${gameId} path=${filePath || ''}\n`
    fs.appendFileSync(logPath, message)
  } catch {
    // ignore logging errors
  }

  activeDownloads.delete(gameId)

  BrowserWindow.getAllWindows().forEach((browserWindow) => {
    browserWindow.webContents.send('download-progress', {
      gameId,
      percent: 0,
      downloaded: 0,
      total: 0,
      speed: 0,
      eta: 0,
      active: false,
    })
  })

  return true
})

ipcMain.handle('pause-download', async (_, { gameId }) => {
  const activeDownload = activeDownloads.get(gameId)
  if (!activeDownload) return false
  activeDownload.paused = true
  try {
    BrowserWindow.getAllWindows().forEach((browserWindow) => {
      browserWindow.webContents.send('download-progress', {
        gameId,
        percent: 0,
        downloaded: activeDownload.downloaded || 0,
        total: activeDownload.total || 0,
        speed: 0,
        eta: 0,
        active: false,
        paused: true,
      })
    })
  } catch {}
  return true
})

ipcMain.handle('resume-download', async (_, { gameId }) => {
  const activeDownload = activeDownloads.get(gameId)
  if (!activeDownload) return false
  activeDownload.paused = false
  try {
    if (activeDownload.resumeResolver) {
      try { activeDownload.resumeResolver() } catch {}
    }
    BrowserWindow.getAllWindows().forEach((browserWindow) => {
      browserWindow.webContents.send('download-progress', {
        gameId,
        percent: 0,
        downloaded: activeDownload.downloaded || 0,
        total: activeDownload.total || 0,
        speed: 0,
        eta: 0,
        active: true,
        paused: false,
      })
    })
  } catch {}
  return true
})

ipcMain.handle('open-path', async (_, { path: targetPath }) => {
  if (!targetPath) return false
  try {
    const resolved = targetPath.trim()
    const isDirectory = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()
    if (isDirectory) {
      await shell.openPath(resolved)
      return true
    }

    shell.showItemInFolder(resolved)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('set-minimize-to-tray', async (_, enabled) => {
  minimizeToTrayEnabled = !!enabled
  persistSettings({ minimizeToTray: minimizeToTrayEnabled })
  if (mainWindow) {
    if (minimizeToTrayEnabled) {
      createTrayIcon()
    } else if (tray) {
      tray.destroy()
      tray = null
    }
  }
  return true
})

ipcMain.handle('set-run-on-startup', async (_, enabled) => {
  const nextEnabled = !!enabled
  runOnStartupEnabled = nextEnabled
  persistSettings({ runOnStartup: runOnStartupEnabled })
  applyStartupSetting(nextEnabled)
  return true
})

ipcMain.handle('get-app-settings', async () => ({
  minimizeToTray: minimizeToTrayEnabled,
  runOnStartup: runOnStartupEnabled,
}))

ipcMain.handle('minimize-window', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize()
  }
  return true
})

ipcMain.handle('maximize-window', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false
  }

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }

  return true
})

ipcMain.handle('close-window', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  }
  return true
})

ipcMain.handle('open-external', async (_, targetUrl) => {
  if (!targetUrl) return false
  try {
    await shell.openExternal(targetUrl)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('check-for-app-updates', async () => {
  try {
    return getUpdateState()
  } catch {
    return { checking: false, available: false, downloaded: false, error: 'Update check unavailable' }
  }
})

function createWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    return mainWindow
  }

  const win = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#07111f',
    title: 'Dreko Games Launcher',
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    icon: appIcon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  mainWindow = win

  if (minimizeToTrayEnabled) {
    createTrayIcon()
  }

  setupAutoUpdater(win)

  win.on('minimize', (event) => {
    if (minimizeToTrayEnabled) {
      event.preventDefault()
      win.hide()
    }
  })

  win.on('close', (event) => {
    if (minimizeToTrayEnabled && !app.isQuitting) {
      event.preventDefault()
      win.hide()
      return
    }
  })

  win.on('restore', () => {
    if (tray) {
      tray.setToolTip('Dreko Games')
    }
  })

  const devUrl = 'http://localhost:4316'
  const startUrl = isDev
    ? devUrl
    : (hasBuiltApp ? `file://${distIndexPath}` : devUrl)

  win.loadURL(startUrl)
  try {
    win.webContents.on('did-finish-load', () => {
      try { console.log('[main] win did-finish-load, url=', win.webContents.getURL()) } catch {}
      try {
        // If React did not render anything, inject a minimal visible fallback so the window isn't blank
        win.webContents.executeJavaScript(`(function(){try{const r=document.getElementById('root'); if(r && r.childElementCount===0){r.innerHTML='<div style="color:#e6eef8;background:#04050a;padding:28px 24px;font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;">Dreko Games launcher starting…</div>'}}catch(e){} })()`)
          .catch(() => {})
      } catch {}
    })

    // forward renderer console logs to main terminal for debugging
    win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      try { console.log('[renderer console]', message, '(', sourceId, line, ')') } catch {}
    })
  } catch {}
  // Temporary test: inject a visible test element into #root to verify rendering
  // test-inject removed
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  return win
}

app.whenReady().then(() => {
  applySavedSettings()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  app.isQuitting = true
  if (tray) {
    tray.destroy()
    tray = null
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

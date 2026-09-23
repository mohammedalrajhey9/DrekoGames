const http = require('http')

const data = JSON.stringify({
  email: 'admin@example.local',
  password: 'Password123!',
  returnSecureToken: true,
})

const options = {
  hostname: '127.0.0.1',
  port: 9099,
  path: '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=any',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
}

const req = http.request(options, (res) => {
  let body = ''
  res.on('data', (chunk) => (body += chunk))
  res.on('end', () => {
    console.log('Status:', res.statusCode)
    try {
      console.log('Body:', JSON.parse(body))
    } catch (e) {
      console.log('Body:', body)
    }
  })
})

req.on('error', (e) => {
  console.error('Request error', e)
})

req.write(data)
req.end()

const http = require('http')

function post(path, payload) {
  const data = JSON.stringify(payload)
  const options = {
    hostname: '127.0.0.1',
    port: 9099,
    path: path + '?key=any',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  }
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(body)
          resolve({ status: res.statusCode, body: json })
        } catch (e) {
          resolve({ status: res.statusCode, body })
        }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function run() {
  const email = 'admin@example.local'
  const password = 'Password123!'
  // create account
  const signup = await post('/identitytoolkit.googleapis.com/v1/accounts:signUp', { email, password, returnSecureToken: true })
  console.log('SignUp:', signup.status, signup.body)
  // now sign in
  const signin = await post('/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword', { email, password, returnSecureToken: true })
  console.log('SignIn:', signin.status, signin.body)
}

run().catch((e) => { console.error(e) })

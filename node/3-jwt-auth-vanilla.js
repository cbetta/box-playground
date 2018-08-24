// Requires Enterprise application access
// and Perform Actions as Users feature
// Authentication method should be "OAuth 2.0 with JWT (Server Authentication)"
const fs = require('fs')
const crypto = require('crypto')
const querystring = require('querystring')
const https = require('https')

// Requests an access token using JWT
let requestAccessToken = function (config) {
  return new Promise((resolve, reject) => {
    let body = generateAuthenticationBody(config)

    let request = https.request('https://api.box.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': body.length
      }
    }, (response) => {
      response.on('data', (data) => {
        resolve(JSON.parse(data).access_token)
      })
    })

    request.write(body)
    request.end()
  })
}

// Generates the JWT and creates the body
let generateAuthenticationBody = function (config) {
  let claims = {
    "iss": config.boxAppSettings.clientID,
    "sub": config.enterpriseID,
    "box_sub_type": "enterprise",
    "aud": "https://api.box.com/oauth2/token",
    "jti": crypto.randomBytes(64).toString('hex'),
    "exp": Math.floor(Date.now() / 1000) + 45
  }

  let assertion = createJWT(claims, config)

  return querystring.stringify({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: assertion,
    client_id: config.boxAppSettings.clientID,
    client_secret: config.boxAppSettings.clientSecret
  })
}

// Signs the JWT
let createJWT = function (claims, config) {
  let header = Buffer.from(JSON.stringify({
    "alg": 'RS512',
    "typ": "JWT"
  })).toString('base64')

  let payload = Buffer.from(JSON.stringify(claims)).toString('base64')
  let sign = crypto.createSign('SHA512')
  sign.write(`${header}.${payload}`)
  sign.end()

  let signature = sign.sign({ 
    key: config.boxAppSettings.appAuth.privateKey, 
    passphrase: config.boxAppSettings.appAuth.passphrase 
  }, 'base64')

  return `${header}.${payload}.${signature}`
}

// Fetches the first enterprise user
let getFirstUser = function (accessToken) {
  return new Promise((resolve, reject) => {
    https.get('https://api.box.com/2.0/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }, (response) => {
      response.on('data', (data) => {
        let users = JSON.parse(data)
        resolve(users.entries[0])
      })
    })
  })
}

// Fetches a folder using am access token
let fetchFolder = function (accessToken, user) {
  return new Promise((resolve, reject) => {
    https.get('https://api.box.com/2.0/folders/0', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'As-User': user.id
      }
    }, (response) => {
      response.on('data', (data) => {
        let folder = JSON.parse(data)
        resolve(folder)
      })
    })
  })
}

// Fetch the content of a user folder using JWT authentication
// and without using any libraries.
let start = async () => {
  let config = JSON.parse(fs.readFileSync('private_key.json'))
  let accessToken = await requestAccessToken(config)
  let user = await getFirstUser(accessToken)
  let folder = await fetchFolder(accessToken, user)
  console.dir(folder, { depth: 5 })
}

start()
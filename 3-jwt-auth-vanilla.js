const fs = require('fs')
const crypto = require('crypto')
const querystring = require('querystring')
const https = require('https')

const config = JSON.parse(fs.readFileSync('config.json'))

// Requests an access token using JWT
let requestAccessToken = function(callback) {
  let body = generateBody()

  let request = https.request({
    host: 'api.box.com',
    path: '/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': body.length
    }
  }, (response) => {
    response.on('data', (data) => {
      callback(JSON.parse(data).access_token)
    })
  })
  
  request.write(body)
  request.end()
}

// Generates the JWT and creates the body
let generateBody = function() {
  let claims = {
    "iss": config.boxAppSettings.clientID,
    "sub": config.enterpriseID,
    "box_sub_type": "enterprise",
    "aud": "https://api.box.com/oauth2/token",
    "jti": crypto.randomBytes(64).toString('hex'),
    "exp": Math.floor(Date.now() / 1000) + 45
  }

  let assertion = createJWT(claims, config.boxAppSettings.appAuth.privateKey, config.boxAppSettings.appAuth.passphrase)

  return querystring.stringify({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: assertion,
    client_id: config.boxAppSettings.clientID,
    client_secret: config.boxAppSettings.clientSecret
  })
}

// Signs the JWT
let createJWT = function (claims, key, passphrase) {
  let header = Buffer.from(JSON.stringify({
    "alg": 'RS512',
    "typ": "JWT"
  })).toString('base64')

  let payload = Buffer.from(JSON.stringify(claims)).toString('base64')
  let sign = crypto.createSign('SHA512')
  sign.write(`${header}.${payload}`)
  sign.end()

  let signature = sign.sign({ key, passphrase }, 'base64')
  return `${header}.${payload}.${signature}`
}

// Fetches the first enterprise user
let getFirstUser = function (callback) {
  return (access_token) => {
    https.get('https://api.box.com/2.0/users', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    }, (response) => {
      response.on('data', (data) => {
        let users = JSON.parse(data)
        callback(access_token, users.entries[0].id)
      })
    })
  }
}

// Fetches a folder using am access token
let fetchFolder = function (access_token, user_id) {
  https.get('https://api.box.com/2.0/folders/0', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'As-User': user_id
    }
  }, (response) => {
    response.on('data', (data) => {
      let folder = JSON.parse(data)
      console.dir(folder, { depth: 3 })
    })
  })
}

// Fetch the content of a user folder using JWT authentication
// and without using any libraries.
requestAccessToken(getFirstUser(fetchFolder))

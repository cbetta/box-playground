const jwt = require('jsonwebtoken')
const fs = require('fs')
const uuid = require('uuid/v4')
const fetch = require('node-fetch')

const config = JSON.parse(fs.readFileSync('config.json'))

// Requests an access token using JWT
let requestAccessToken = function () {
  return fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: generateAssertion(),
      client_id: config.boxAppSettings.clientID,
      client_secret: config.boxAppSettings.clientSecret
    })
  }).then(res => res.json()).then(token => token.access_token)
}

// Generates the JWT assertion
let generateAssertion = function () {
  let claims = {
    "iss": config.boxAppSettings.clientID,
    "sub": config.enterpriseID,
    "box_sub_type": "enterprise",
    "aud": "https://api.box.com/oauth2/token",
    "jti": uuid(),
    "exp": Math.floor(Date.now() / 1000) + 45
  }

  return jwt.sign(claims, {
    key: config.boxAppSettings.appAuth.privateKey,
    passphrase: config.boxAppSettings.appAuth.passphrase
  }, {
    algorithm: 'RS256'
  })
}

// Fetches the first enterprise user
let getFirstUser = function (access_token) {
  return fetch('https://api.box.com/2.0/users', {
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  }).then(res => res.json()).then(users => {
    let user_id = users.entries[0].id
    return { user_id, access_token }
  })
}

// Fetches a folder using am access token
let fetchFolder = function ({ user_id, access_token }) {
  fetch('https://api.box.com/2.0/folders/0', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'As-User': user_id
    }
  }).then(res => res.json()).then(console.dir)
}

// Fetch the content of a user folder using JWT authentication
// using popular libraries.
requestAccessToken().then(getFirstUser).then(fetchFolder)
// Requires Enterprise application access
// and Generate User Access Tokens feature
// Authentication method should be "OAuth 2.0 with JWT (Server Authentication)"
const jwt = require('jsonwebtoken')
const fs = require('fs')
const uuid = require('uuid/v4')
const fetch = require('node-fetch')

const config = JSON.parse(fs.readFileSync('private_key.json'))

// Requests an access token using JWT for the service account
let requestServiceAccountAccessToken = function () {
  return fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: generateServiceAccountAssertion(),
      client_id: config.boxAppSettings.clientID,
      client_secret: config.boxAppSettings.clientSecret
    })
  }).then(res => res.json()).then(token => token.access_token)
}

// Requests an access token using JWT for the user account
let requestUserAccountAccessToken = function(user_id) {
  return fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: generateUserAccountAssertion(user_id),
      client_id: config.boxAppSettings.clientID,
      client_secret: config.boxAppSettings.clientSecret
    })
  }).then(res => res.json()).then(token => token.access_token)
}

// Generates the JWT assertion for a service account 
let generateServiceAccountAssertion = function () {
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

// Generates the JWT assertion for a user account 
let generateUserAccountAssertion = function (user_id) {
  let claims = {
    "iss": config.boxAppSettings.clientID,
    "sub": user_id,
    "box_sub_type": "user",
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
    return users.entries[0].id
  })
}

// Fetches a folder using am access token
let fetchFolder = function (access_token) {
  fetch('https://api.box.com/2.0/folders/0', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
    }
  }).then(res => res.json()).then(console.dir)
}

// Fetch the content of a user folder using JWT authentication
// using popular libraries.
requestServiceAccountAccessToken()
  .then(getFirstUser)
  .then(requestUserAccountAccessToken)
  .then(fetchFolder)

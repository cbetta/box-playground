// Requires Enterprise application access
// and Perform Actions as Users
// Authentication method should be "OAuth 2.0 with JWT (Server Authentication)"
// Requires a file in the root folder
const jwt = require('jsonwebtoken')
const fs = require('fs')
const uuid = require('uuid/v4')
const fetch = require('node-fetch')

// Requests an access token using JWT
let requestAccessToken = function (config) {
  return fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: generateAssertion(config),
      client_id: config.boxAppSettings.clientID,
      client_secret: config.boxAppSettings.clientSecret
    })
  }).then(res => res.json()).then(token => token.access_token)
}

// Generates the JWT assertion
let generateAssertion = function (config) {
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
let getFirstUser = function (accessToken) {
  return fetch('https://api.box.com/2.0/users', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  .then(res => res.json())
  .then(users => users.entries[0])
}

// Fetches a folder using am access token
let fetchFolderItems = function (accessToken, user) {
  return fetch('https://api.box.com/2.0/folders/0/items', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'As-User': user.id
    }
  })
  .then(res => res.json())  
  .then(res => res.entries)
}

let fetchFirstFile = function (accessToken, user, entries) {
  let files = entries.filter(entry => entry.type === 'file')
  let file = files[0]
  
  return fetch(`https://api.box.com/2.0/files/${file.id}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'As-User': user.id
    }
  })
  .then(res => res.json())
}

// Fetch the content of a user folder using JWT authentication
// using popular libraries.
;(async () => {
  let config = JSON.parse(fs.readFileSync('private_key.json'))
  let accessToken = await requestAccessToken(config)
  let user = await getFirstUser(accessToken)
  let entries = await fetchFolderItems(accessToken, user)
  let file = await fetchFirstFile(accessToken, user, entries)
  console.dir(file)
})()
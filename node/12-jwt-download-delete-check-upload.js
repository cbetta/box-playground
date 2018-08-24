// Requires Enterprise application access
// and Perform Actions as Users
// Authentication method should be "OAuth 2.0 with JWT (Server Authentication)"
// Requires a file in the root folder
const jwt = require('jsonwebtoken')
const fs = require('fs')
const uuid = require('uuid/v4')
const fetch = require('node-fetch')
const FormData = require('form-data')

// Requests an access token using JWT for the service account
let requestServiceAccountAccessToken = function (config) {
  return fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: generateServiceAccountAssertion(config),
      client_id: config.boxAppSettings.clientID,
      client_secret: config.boxAppSettings.clientSecret
    })
  })
  .then(res => res.json())
  .then(token => token.access_token)
}

// Requests an access token using JWT for the user account
let requestUserAccountAccessToken = function (config, user) {
  return fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: generateUserAccountAssertion(config, user),
      client_id: config.boxAppSettings.clientID,
      client_secret: config.boxAppSettings.clientSecret
    })
  })
  .then(res => res.json())
  .then(token => token.access_token)
}

// Generates the JWT assertion for a service account 
let generateServiceAccountAssertion = function (config) {
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
let generateUserAccountAssertion = function (config, user) {
  let claims = {
    "iss": config.boxAppSettings.clientID,
    "sub": user.id,
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
let getFirstFile = function (accessToken) {
  return fetch('https://api.box.com/2.0/folders/0/items', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  })
  .then(res => res.json())
  .then(res =>  res.entries.filter(entry => entry.type === 'file'))
  .then(files => files[0])
}

let download = async function (accessToken, file) {
  let buffer = await fetch(`https://api.box.com/2.0/files/${file.id}/content`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  }).then(res => res.buffer())
  fs.writeFileSync(file.name, buffer)
  console.log(`${file.name} downloaded`)
}

let deleteFile = async function (accessToken, file) {
  await fetch(`https://api.box.com/2.0/files/${file.id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  })
  console.log(`${file.name} deleted`)
}

let preflightCheck = async function(accessToken, file) {
  let check = await fetch(`https://api.box.com/2.0/files/content`, {
    method: 'OPTIONS',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ 
      name: file.name, 
      parent: { id: '0' } 
    })
  })
  .then(res => res.json())
 
  console.log(`Preflight passed: ${check.upload_url}`)
}

let upload = async function(accessToken, file) {
  // Build up the params
  let params = new FormData()
  params.append('attributes', JSON.stringify({
    name: file.name,
    parent: {
      id: '0'
    }
  }))
  params.append('file', fs.createReadStream(file.name))

  let upload = await fetch('https://upload.box.com/api/2.0/files/content', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: params
  })
  console.log(`${file.name} uploaded`)
}

;(async () => {
  const config = JSON.parse(fs.readFileSync('private_key.json'))
  let serviceAccountAccessToken = await requestServiceAccountAccessToken(config)
  let user = await getFirstUser(serviceAccountAccessToken)
  let accessToken = await requestUserAccountAccessToken(config, user)
  let file = await getFirstFile(accessToken)

  await download(accessToken, file)
  await deleteFile(accessToken, file)
  await preflightCheck(accessToken, file)
  await upload(accessToken, file)
})()
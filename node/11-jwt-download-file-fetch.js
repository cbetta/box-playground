// Requires Enterprise application access
// and Perform Actions as Users
// Authentication method should be "OAuth 2.0 with JWT (Server Authentication)"
// Requires a file in the root folder
const jwt = require('jsonwebtoken')
const fs = require('fs')
const uuid = require('uuid/v4')
const fetch = require('node-fetch')

const config = JSON.parse(fs.readFileSync('private_key.json'))

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
    return {
      user_id,
      access_token
    }
  })
}

// Fetches a folder using am access token
let getFirstFolderItem = function ({
  user_id,
  access_token
}) {
  return fetch('https://api.box.com/2.0/folders/0/items', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'As-User': user_id
    }
  }).then(res => res.json()).then((res) => {
    let files = res.entries.filter(entry => entry.type === 'file')
    let file = files[0]
    return {
      access_token,
      user_id,
      file
    }
  })
}

let downloadFirstFile = async function ({
    access_token,
    user_id,
    file
  }) {
  let buffer = await fetch(`https://api.box.com/2.0/files/${file.id}/content`, {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'As-User': user_id
    }
  }).then(res => res.buffer())
  
  fs.writeFileSync(file.name, buffer)
  console.log(`${file.name} downloaded`)
}

// Fetch the content of a user folder using JWT authentication
// using popular libraries.
requestAccessToken().then(getFirstUser).then(getFirstFolderItem).then(downloadFirstFile)
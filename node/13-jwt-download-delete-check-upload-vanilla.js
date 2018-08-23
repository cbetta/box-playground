// Requires Enterprise application access
// and Perform Actions as Users
// Authentication method should be "OAuth 2.0 with JWT (Server Authentication)"
// Requires a file in the root folder
const jwt = require('jsonwebtoken')
const fs = require('fs')
const uuid = require('uuid/v4')
const https = require('https')
const fetch = require('node-fetch')
const FormData = require('form-data')
var request = require('request')
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
let requestUserAccountAccessToken = function (user_id) {
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
  }).catch(console.dir)
}

// Fetches a folder using am access token
let getFirstFolderItem = function (access_token) {
  return fetch('https://api.box.com/2.0/folders/0/items', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
    }
  }).then(res => res.json()).then((res) => {
    let files = res.entries.filter(entry => entry.type === 'file')
    let file = files[0]
    return {
      access_token,
      file
    }
  })
}

let downloadDeleteUploadFile = async function ({
    access_token,
    file
  }) {
  
  // Dowload
  downloadFile(access_token, file, () => {
    console.log(`${file.name} downloaded`)
    deleteFile(access_token, file, () => {
      console.log(`${file.name} deleted`)
      preflightCheckFile(access_token, file, (url) => {
        console.log(`${file.name} checked - ${url}`)
        reuploadFile(access_token, file, () => {
          console.log(`${file.name} uploaded`)
        })
      })
    })
  })
}

let downloadFile = function (access_token, file, callback) {
  let stream = fs.createWriteStream(file.name)

  https.get({
    host: 'api.box.com',
    path: `/2.0/files/${file.id}/content`,
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  }, (redirect) => {
    https.get(redirect.headers.location, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    }, (response) => {
      response.pipe(stream)
      stream.on('finish', function () {
        stream.close(callback);
      })
    })
  })
}

let deleteFile = function (access_token, file, callback) {
  // // Delete file
  // let request = https.request({
  //   host: 'api.box.com',
  //   path: `/2.0/files/${file.id}`,
  //   method: 'DELETE',
  //   headers: {
  //     'Authorization': `Bearer ${access_token}`,
  //   }
  // }, callback)
  // request.end()
  callback()
}

let preflightCheckFile = function(access_token, file, callback) {
  let request = https.request('https://api.box.com/2.0/files/content', {
    method: 'OPTIONS',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`,
    },
  }, (response) => {
    response.on('data', (data) => {
      let res = JSON.parse(data)
      callback(res.upload_url)
    })
  })
  request.write(JSON.stringify({
    name: file.name,
    parent: {
      id: '0'
    }
  }))

  request.end()
}

let reuploadFile = function(access_token, file, callback) {
  let params = new FormData()
  params.append('attributes', JSON.stringify({
    name: file.name,
    parent: {
      id: '0'
    }
  }))
  params.append('file', fs.createReadStream(file.name))

  let request = https.request('https://upload.box.com/api/2.0/files/content', {
    method: 'POST',
    headers: Object.assign({
      'Authorization': `Bearer ${access_token}`,
    }, params.getHeaders())
  }, (response) => {
    response.on('data', callback)
  })

  params.pipe(request)
}

requestServiceAccountAccessToken()
  .then(getFirstUser)
  .then(requestUserAccountAccessToken)
  .then(getFirstFolderItem)
  .then(downloadDeleteUploadFile)
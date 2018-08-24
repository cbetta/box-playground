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
    // Generate the JWT request body
    let body = generateAuthenticationBody(config)
    // Start the reuest
    let request = https.request('https://api.box.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': body.length
      }
    }, (response) => {
      // On data, parse to JSON and resolve promise
      response.on('data', (data) => {
        resolve(JSON.parse(data).access_token)
      })
    })

    // Remember to write the data
    request.write(body)
    request.end()
  })
}

// Generates the body for the authentication request
let generateAuthenticationBody = function (config) {
  // The JWT claims
  let claims = {
    "iss": config.boxAppSettings.clientID,
    "sub": config.enterpriseID,
    "box_sub_type": "enterprise",
    "aud": "https://api.box.com/oauth2/token",
    // A secure randomly generated ID
    "jti": crypto.randomBytes(64).toString('hex'),
    // let's expire this claim in 45 seconds
    "exp": Math.floor(Date.now() / 1000) + 45
  }

  // Create the JWT token
  let assertion = generateJWT(claims, config)

  // Form the body
  return querystring.stringify({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: assertion,
    client_id: config.boxAppSettings.clientID,
    client_secret: config.boxAppSettings.clientSecret
  })
}

// Create and sign the JWT
let generateJWT = function (claims, config) {
  // Let's use the highest encryption available
  let header = Buffer.from(JSON.stringify({
    "alg": 'RS512',
    "typ": "JWT"
  })).toString('base64')

  // Build the payload
  let payload = Buffer.from(JSON.stringify(claims)).toString('base64')

  // Prepare to sign the header and payload
  let signer = crypto.createSign('SHA512')
  signer.write(`${header}.${payload}`)
  signer.end()

  // Create a signature
  let signature = signer.sign({ 
    key: config.boxAppSettings.appAuth.privateKey, 
    passphrase: config.boxAppSettings.appAuth.passphrase
  }, 'base64')

  // Combine all parts into a full JWT
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

// Kicks off an upload session for the file given
let startuploadSession = function (accessToken, user, fileName) {
  return new Promise((resolve, reject) => {
    let fileSize = fs.statSync(fileName).size

    let request = https.request('https://upload.box.com/api/2.0/files/upload_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Tyoe': 'application/json',
        'As-User': user.id
      }
    }, (response) => {
      response.on('data', (data) => {
        resolve(JSON.parse(data))
      })
    })

    request.write(JSON.stringify({
      folder_id: '0',
      file_size: fileSize,
      file_name: fileName
    }))
    request.end()
  })
}

// Kick off the upload of all the chunks
let uploadChunks = function (accessToken, user, uploadSession, fileName) {
  return new Promise((resolve, reject) => {
    console.log(`Part size: ${uploadSession.part_size}`)

    // Init some variables
    let offset = 0
    let parts = []
    let asyncUploads = []
    let hash = crypto.createHash('sha1')
    let fileSize = fs.statSync(fileName).size

    // Open a file stream
    var stream = fs.createReadStream(fileName)

    // When the file is readable, read a chunk
    stream.on('readable', () => {
      let chunk = stream.read(uploadSession.part_size)

      // If the chunks is actually there, upload it
      if (chunk) {
        console.log(`Uploading part: ${offset}-${offset + chunk.length}`)
        let upload = uploadChunk(accessToken, user, uploadSession, chunk, offset, fileSize)
          // And add the part to our list of parts
          .then((data) => parts.push(data.part))

        // Make sure to track all the async uploads
        asyncUploads.push(upload)

        // Update the offset and hash for the commit later
        offset += chunk.length
        hash.update(chunk)
      }
    })
    // When the file has been fully read, we wait for all uploads to complete
    .on('end', () => {
      // When all uploads completed, sort the parts and resolve the promise
      Promise.all(asyncUploads).then(async () => {
        console.log('All uploads done')

        // Sort the parts in order
        parts.sort((a, b) => (a.offset - b.offset)) 
        // Calculate the digest of the file
        let digest = hash.digest('base64')
        // Resolve the promise
        resolve({ digest, parts })
      })
    })
  })
}

// Uploads an individual file chunk
let uploadChunk = function (accessToken, user, uploadSession, chunk, offset, fileSize) {
  return new Promise((resolve, reject) => {
    // Calculate the digest for this chunk
    let hash = crypto.createHash('sha1')
    hash.update(chunk)
    let digest = hash.digest('base64')

    // Kick off the request
    let request = https.request(`https://upload.box.com/api/2.0/files/upload_sessions/${uploadSession.id}`, {
      method: 'PUT',
      headers: {
        'Digest': `sha=${digest}`,
        'Content-Range': `bytes ${offset}-${offset + chunk.length - 1}/${fileSize}`,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Tyoe': 'application/octet-stream',
        'As-User': user.id
      }
    }, (response) => {
      // When the result comes in, resovle the promise
      response.on('data', (data) => {
        resolve(JSON.parse(data),)
      })
    })

    // Write the chunk to the body of the request
    request.write(chunk)
    request.end()
  })
}

// Commit the uploaded parts to the file on the filesystem
let commitSession = function (accessToken, user, uploadSession, digest, parts) {
  let request = https.request(`https://upload.box.com/api/2.0/files/upload_sessions/${uploadSession.id}/commit`, {
    method: 'POST',
    headers: {
      'Digest': `sha=${digest}`,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Tyoe': 'application/json',
      'As-User': user.id
    }
  }, (response) => {
    response.on('data', (data) => {
      console.log('Upload complete')
    })
  })

  request.write(JSON.stringify({parts: parts}))
  request.end()
}

// Start the chunked upload
let start = async () => {
  // Some constants
  const fileName = '50MB.zip'
  const config = JSON.parse(fs.readFileSync('private_key.json'))

  // First get an enterprise access token
  let accessToken = await requestAccessToken(config)
  // Then fetch the first user in the enterprise
  let user = await getFirstUser(accessToken)
  // Now let's start a chunked upload session
  let uploadSession = await startuploadSession(accessToken, user, fileName)
  // Then, kick off uploading all the chunks of the file
  let { digest, parts } = await uploadChunks(accessToken, user, uploadSession, fileName)
  // Finally, commit the file
  commitSession(accessToken, user, uploadSession, digest, parts)
}

start()
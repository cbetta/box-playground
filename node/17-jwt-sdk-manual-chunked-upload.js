// Requires Enterprise application access
// and Perform Actions as Users
// Authentication method should be "OAuth 2.0 with JWT (Server Authentication)"
// Requires a file in the root folder
const BoxSDK = require('box-node-sdk')
const fs = require('fs')
const crypto = require('crypto')

const config = JSON.parse(fs.readFileSync('private_key.json'))
const sdk = BoxSDK.getPreconfiguredInstance(config)

// Wrap promises for easy logging
require('promise-log')(Promise)

let start = async function () {
  // get the first user for this enterprise
  let serviceClient = sdk.getAppAuthClient('enterprise')
  let users = await serviceClient.enterprise.getUsers()
  let user = users.entries[0]
  let client = sdk.getAppAuthClient('user', user.id)

  // Upload a large file
  let fileName = '50MB.zip'
  var stream = fs.createReadStream(fileName)
  let size = fs.statSync(fileName).size
  console.log(`Upload size: ${size}`)

  let session = await client.files.createUploadSession(
    '0',
    size,
    fileName,
    stream
  )
  console.log(`Part size: ${session.part_size}`)

  let offset = 0
  let parts = []
  let hash = crypto.createHash('sha1')

  let asyncUploads = []

  stream.on('readable', () => {
    let chunk = stream.read(session.part_size)
    if (chunk) {
      console.log(`Uploading part: ${offset}-${offset+chunk.length}`)
      let upload = client.files.uploadPart(session.id, chunk, offset, size)
        .then((data) => parts.push(data.part))
      asyncUploads.push(upload)

      offset += chunk.length
      hash.update(chunk)
    }      
  }).on('end', () => {
    Promise.all(asyncUploads).then(async () => {
      console.log('All uploads done')
      console.log('Commiting parts')

      // Sort the parts in order
      parts.sort((a,b) => {
        return a.offset - b.offset
      })

      let digest = hash.digest('base64')
      await client.files.commitUploadSession(session.id, digest, {
        parts: parts
      })

      console.log('Upload complete')
    })
  })
}

start()
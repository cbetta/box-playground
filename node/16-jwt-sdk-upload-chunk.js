// Requires Enterprise application access
// and Perform Actions as Users
// Authentication method should be "OAuth 2.0 with JWT (Server Authentication)"
// Requires a file in the root folder
const BoxSDK = require('box-node-sdk')
const fs = require('fs')

const config = JSON.parse(fs.readFileSync('private_key.json'))
const sdk = BoxSDK.getPreconfiguredInstance(config)

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

  let uploader = await client.files.getChunkedUploader(
    '0',
    size,
    fileName,
    stream
  )

  uploader.start()
}

start()
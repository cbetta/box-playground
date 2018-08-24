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
  let folder = await client.folders.getItems(0)
  let file = folder.entries.filter(item => item.type === 'file')[0]
  console.log(file)
  
  let stream = fs.createReadStream('user.png');
  client.files.uploadNewFileVersion(file.id, 'user.png', stream)
}

start()
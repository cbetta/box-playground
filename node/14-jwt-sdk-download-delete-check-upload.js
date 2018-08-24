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

  // Get the first file in the root folder for this user
  let userClient = sdk.getAppAuthClient('user', user.id)
  let items = await userClient.folders.getItems('0')
  let file = items.entries.filter(item => item.type === 'file')[0]

  // Download the file
  let downloadStream = await userClient.files.getReadStream(file.id)
  var handle = fs.createWriteStream(file.name);
  downloadStream.pipe(handle);
  console.log(`downloaded ${file.name}`)

  // Delete a file
  await userClient.files.delete(file.id)
  console.log(`${file.name} deleted`)

  // Check if we can make a new upload
  let check = await userClient.files.preflightUploadFile(
    '0', { name: file.id }
  )
  console.log(`${file.name} checked - ${check.upload_url}`)

  // Re-upload the file
  let uploadStream = fs.createReadStream(file.name);
  let confirmation = await userClient.files.uploadFile('0', file.name, uploadStream)
  file = confirmation.entries[0]
  console.log(`${file.name} uploaded - file ${file.id}`)
}

start()
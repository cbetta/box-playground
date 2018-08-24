// Requires Enterprise application access
// and Generate User Access Tokens feature
// Authentication method should be "OAuth 2.0 with JWT (Server Authentication)"
const BoxSDK = require('box-node-sdk')
const fs = require('fs')

const config = JSON.parse(fs.readFileSync('private_key.json'))
const sdk = BoxSDK.getPreconfiguredInstance(config)

;(async () => {
  let serviceClient = sdk.getAppAuthClient('enterprise')
  let users = await serviceClient.enterprise.getUsers()
  let user = users.entries[0]

  let userClient = sdk.getAppAuthClient('user', user.id)
  let folder = await userClient.folders.get(0)
  
  console.dir(folder, { depth: 3 })
})()
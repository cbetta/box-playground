// Requires Enterprise application access
// and Generate User Access Tokens feature
const BoxSDK = require('box-node-sdk')
const fs = require('fs')

const config = JSON.parse(fs.readFileSync('private_key.json'))
const sdk = BoxSDK.getPreconfiguredInstance(config)

let fetch = async function () {
  let serviceClient = sdk.getAppAuthClient('enterprise')
  let users = await serviceClient.enterprise.getUsers()
  let user = users.entries[0]

  let userClient = sdk.getAppAuthClient('user', user.id)
  return userClient.folders.get(0)
}

fetch().then(console.dir)
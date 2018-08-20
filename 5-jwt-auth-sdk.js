const BoxSDK = require('box-node-sdk')
const fs = require('fs')

const config = JSON.parse(fs.readFileSync('config.json'))

const sdk = new BoxSDK({
  clientID: config.boxAppSettings.clientID,
  clientSecret: config.boxAppSettings.clientSecret,
  appAuth: {
    keyID: config.boxAppSettings.appAuth.publicKeyID,
    privateKey: config.boxAppSettings.appAuth.privateKey,
    passphrase: config.boxAppSettings.appAuth.passphrase
  }
})

let fetch = async function () {
  let serviceClient = sdk.getAppAuthClient('enterprise', config.enterpriseID)
  let users = await serviceClient.enterprise.getUsers()
  let user = users.entries[0]

  let userClient = sdk.getAppAuthClient('user', user.id)
  return userClient.folders.get(0)
}

fetch().then(console.dir)
// Use modern ES6 imports and a enterprise account on NPM
import Box, { ROOT_FOLDER } from '@box/sdk'

// Allow for initializing the SDK from the config file exported from
// the developer console
const sdk = Box.fromFile('private_key.json')

// Use more explicit language to initialize a client as the app user
let client = sdk.actAsAppUser()

// Remove users from the oddly unnecessary extra `enterprise` namespace
// and instead of using getUsers we just use users.all() 
client.users.all().then((users) => {
  // User a more explicit method to initialize the SDK as a user.
  client = sdk.actAsUser(users.entries[0].id)
  // Use the ROOT_FOLDER constant to make the call to directory `0` 
  // a lot more explicit
  client.folders.get(ROOT_FOLDER).then(console.dir)
})
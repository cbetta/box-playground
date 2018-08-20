// Use modern ES6 imports and a enterprise account on NPM
import { SDK, ROOT_FOLDER } from '@box/sdk'

// Allow for initializing the SDK from the config file exported from
// the developer console
const sdk = SDK.fromFile('../private_key.json')

// Use more explicit language to initialize a client as the enterprise
// and infer the enterprise ID from the config file unless specified
let enterprise = sdk.asEnterprise()

// Remove users from the oddly unnecessary extra `enterprise` namespace
// and instead of using getUsers we just use users.all() 
enterprise.users.all().then((users) => {
  // User a more explicit method to initialize the SDK as a user.
  let user = sdk.asUser(users.entries[0].id)
  // Use the ROOT_FOLDER constant to make the call to directory `0` 
  // a lot more explicit
  user.folders.get(ROOT_FOLDER).then(console.dir)
})
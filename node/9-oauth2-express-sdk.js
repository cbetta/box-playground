// Requires OAuth 2 (not JWT) application access
const express = require('express')
const app = express()
const fs = require('fs')
const qs = require('querystring')
const BoxSDK = require('box-node-sdk')

// The base URL for authentication
const AUTH_BASE_URL = "https://account.box.com/api/oauth2/authorize"
// Loads the credentials from file
const credentials = JSON.parse(fs.readFileSync('oauth2_credentials.json'))

//Initialize the SDK
const sdk = new BoxSDK(credentials);

// Root of the site, shows a login link
app.get('/', (_, response) => {
  let params = qs.stringify({
    'response_type': 'code',
    'client_id': credentials.clientID,
    'redirect_url': credentials.redirectUrl
  })

  let authenticationUrl = `${AUTH_BASE_URL}?${params}`
  response.send(`<a href="${authenticationUrl}">Login</a>`)
})

// Redirect URL where the user is sent to after they 
// allow access to their Box account
app.get('/auth', async (request, response) => {
  let token = await sdk.getTokensAuthorizationCodeGrant(request.query.code)
  let client = sdk.getPersistentClient(token)
  let user = await client.users.get('me')
  response.send(`Hello ${user.name}`)
})

// Starts the express server
app.listen(3000)
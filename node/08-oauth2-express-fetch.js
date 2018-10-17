// Authentication method should be "Standard OAuth 2.0 (User Authentication)"
const express = require('express')
const app = express()
const fs = require('fs')
const qs = require('querystring')
const fetch = require('node-fetch')

// The base URL for authentication
const AUTH_BASE_URL = "https://account.box.com/api/oauth2/authorize"
// Loads the credentials from file
const credentials = JSON.parse(fs.readFileSync('oauth2_credentials.json'))

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
  let token = await getAccessToken(request.query.code)
  let user = await getUserInfo(token)
  response.send(`Hello ${user.name}`)
})

// Exchanges a Code for a user's access token
let getAccessToken = function(code) {
  return fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      client_id: credentials.clientID,
      client_secret: credentials.clientSecret
    })
  })
  .then(res => res.json())
  .then(token => token.access_token)
}

// Uses the user's access token to fetch the user's profile info
let getUserInfo = function (access_token) {
  return fetch('https://api.box.com/2.0/users/me', {
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  })
  .then(res => res.json())
}

// Starts the express server
app.listen(3000)
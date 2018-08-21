// Requires Standard application access
const https = require('https')
const fs = require('fs')

const config = JSON.parse(fs.readFileSync('developer_token.json'))

// Fetch the content of a folder using a time
// limited developer token
https.get('https://api.box.com/2.0/folders/0', {
  headers: {
    "Authorization": `Bearer ${config.token}`
  }
}, (response) => {
  response.on('data', (data) => {
    let response = JSON.parse(data)
    console.dir(response)
  })
})
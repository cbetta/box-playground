// Requires Standard application access
const fetch = require('node-fetch')
const fs = require('fs')

const config = JSON.parse(fs.readFileSync('developer_token.json'))

fetch('https://api.box.com/2.0/folders/0', {
  headers: {
    "Authorization": `Bearer ${config.token}`
  }
}).then(res => res.json()).then(console.dir)


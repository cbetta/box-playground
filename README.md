# Samples for Box Platform  

This is my personal playground for Box's API. The goal of these samples is 
for me to familiarize myself with the Box API and its SDKs.

## Configuration

There are three configuration files for these samples. For all, you need to create an 
account and app on [https://developer.box.com/](https://developer.box.com/) and then head
over to the configuration section for your app.

### `developer_token.json`

In the `Configuration` page of your application is a section called `Developer Token`. Generate a token and then copy-paste it into the `developer_token.json` file.

```json
{
  "token": "[YOUR_TOKEN]"
}
```
> This token is ony valid for a few hours and need to be reset manually every time.

### `private_key.json`

For the samples that use a public/private key, head over to the same `Configuration` page, then make sure your `Authentication Method` is set to `OAuth 2.0 with JWT (Server Authentication)`. Then head down to the `Add and Manage Public Keys` section. 

Click the `Generate a Public/Private Keypair` button and download the resulting file to the 
root of this project into the `private_key.json` file. It should look something like this.

```json
{
  "boxAppSettings": {
    "clientID": "",
    "clientSecret": "",
    "appAuth": {
      "publicKeyID": "",
      "privateKey": "",
      "passphrase": ""
    }
  },
  "enterpriseID": ""
}
```

### `oauth2_credentials.json`

For the samples that use OAauth2 authentication, head over to the  `Configuration` page of your app, then make sure your `Authentication Method` is set to `Standard OAuth 2.0 (User Authentication)`. 

Then copy over the client ID and secret into a file called `oauth2_credentials.json`.

```
{
  "clientID": "",
  "clientSecret": "",
  "redirectUrl": "http://localhost:3000/auth"
}
```

> Make sure your `redirectUrl` matches your app's specified redirect URL on the developer console. Make sure to set this to `http://localhost:3000/auth` for these samples.

###

## Running samples

After you finished the configuration, you can run each samples as follows.

### Note

Not all samples are runnable, as some are thought experiments on future SDK design changes.

### Node

```sh
npm install # or yarn install
node node/[script-name.js]
```
# Samples for Box Platform  

This is my personal playground for Box's API. The goal of these samples is 
for me to familiarize myself with the Box API and its SDKs.

## Configuration

There are two configuration files for these samples. For both, you need to create an 
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

For the samples that use a public/private key, head over to the same `Configuration` page,
but this time head down to the `Add and Manage Public Keys` section. 

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

## Running samples

After you finished the configuration, you can run each samples as follows.

### Note

Not all samples are runnable, as some are thought experiments on future SDK design changes.

### Node

```sh
npm install # or yarn install
node node/[script-name.js]
```
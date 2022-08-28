# cognito-token-observer

<p align="center">
  <img src="https://github.com/romankurnovskii/cognito-token-observer/raw/main/img/icon.png" alt="cognito-token-observer">
</p>

[![NPM version][npm-image]][npm-url]
![npm-typescript]
[![License][github-license]][github-license-url]
[![Build status](https://github.com/romankurnovskii/cognito-token-observer/workflows/CI/badge.svg)](https://github.com/romankurnovskii/cognito-token-observer)
[![Install size][install-size]][install-size-url]

## About

Monitors date expiration of access and id tokens provided by Amazon Cognito. Refreshes when expired.
## Example

[React app](example)

## Installation:

```bash
npm install cognito-token-observer
```

or

```bash
yarn add cognito-token-observer
```

## Usage

Add `CognitoAuthObserver` to your component:

```js
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { CognitoAuthObserver } from 'cognito-token-observer'

function App() {
  const [userData, setUserData] = useState([])

  const cognitoObserver = CognitoAuthObserver({ // init
    clientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
    pullDomain: process.env.REACT_APP_COGNITO_POOL_DOMAIN,
    redirectUrl: process.env.REACT_APP_COGNITO_REDIRECT_URI,
    region: process.env.REACT_APP_COGNITO_REGION,
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
  });

  cognitoObserver.onTokenUpdate(() => { // callback on token update
    setUserData(cognitoObserver.getUserData())
  }, 'onTokenUpdateKey')
  
  const getCodeFromBrowser = () => { 
    // get code after signin/up to aws cognito 
    // to pass to cognitoObserver
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    const code = params['code'];
  }

  const cognitoCode = getCodeFromBrwoser()

  useEffect(() => {
    cognitoObserver.init(cognitoCode)
      .then(isAuthenticated => {
        console.log('Token updated:', isAuthenticated)
      })
  }, [])

  return (
    <div>
        {JSON.stringify(userData)}
    </div>
  )

}
```

## API
#TODO write description
- **init(code?: string) => Promise<boolean>**
CognitoObserver.init: (code?: string | undefined) => Promise<boolean>
- **isActive()**
- **onTokenUpdate()**
- **getAccessToken()**
- **getIdToken()**
- **getUserData()**
- **clearTokens()**

[npm-url]: https://www.npmjs.com/package/cognito-token-observer
[npm-image]: https://img.shields.io/npm/v/cognito-token-observer
[github-license]: https://img.shields.io/github/license/romankurnovskii/cognito-token-observer
[github-license-url]: https://github.com/romankurnovskii/cognito-token-observer/blob/main/LICENSE
[npm-typescript]: https://img.shields.io/npm/types/cognito-token-observer
[install-size]: https://packagephobia.com/badge?p=cognito-token-observer
[install-size-url]: https://packagephobia.com/result?p=cognito-token-observer

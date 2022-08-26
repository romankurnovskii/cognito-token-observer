# cognito-token-observer

[![NPM version][npm-image]][npm-url]
![npm-typescript]
[![License][github-license]][github-license-url]

## Installation:

```bash
npm install cognito-token-observer
```

or

```bash
yarn add cognito-token-observer
```

## Usage :

Add `CognitoAuthObserver` to your component:

```js
import React from 'react'
import ReactDOM from 'react-dom/client'
import { CognitoAuthObserver } from 'cognito-token-observer'


// get code after signin/up to aws cognito
const getCodeFromBrwoser = () =>{
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    const code = params['code'];
}

const cognitoCode = getCodeFromBrwoser()

const cognitoAuthorizer = new CognitoAuthObserver({
  clientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
  pullDomain: process.env.REACT_APP_COGNITO_POOL_DOMAIN,
  redirectUrl: process.env.REACT_APP_COGNITO_REDIRECT_URI,
  region: process.env.REACT_APP_COGNITO_REGION,
  userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
});

await cognitoAuthorizer.fetchCognitoTokens(cognitoCode)


const onTokenUpdate = (isValid: boolean) => {
const userData = cognitoAuthorizer.getUserData();
setUserMetadata({
    ...userData,
});
console.log(97, isValid);
setIsAuthenticated(isValid);
};

cognitoAuthorizer.onTokenUpdate(onTokenUpdate);

```

[npm-url]: https://www.npmjs.com/package/cognito-token-observer
[npm-image]: https://img.shields.io/npm/v/cognito-token-observer
[github-license]: https://img.shields.io/github/license/romankurnovskii/cognito-token-observer
[github-license-url]: https://github.com/romankurnovskii/cognito-token-observer/blob/master/LICENSE
[npm-typescript]: https://img.shields.io/npm/types/cognito-token-observer
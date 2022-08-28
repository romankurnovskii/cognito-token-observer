import { useCallback, useEffect, useState } from 'react';

import { CognitoAuthObserver } from 'cognito-token-observer';

const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID || '';
const pullDomain = process.env.REACT_APP_COGNITO_POOL_DOMAIN || '';
const redirectUrl = process.env.REACT_APP_COGNITO_REDIRECT_URI || '';
const region = process.env.REACT_APP_COGNITO_REGION || '';
const userPoolId = process.env.REACT_APP_COGNITO_USER_POOL_ID || '';

const LOGIN_COGNITO_URL = `${pullDomain}/login?client_id=${clientId}&response_type=code&redirect_uri=${redirectUrl}`;

function App() {
	const [userData, setUserData] = useState([]);

	const cognitoAuthorizer = CognitoAuthObserver({
		clientId,
		pullDomain,
		redirectUrl,
		region,
		userPoolId,
	});

	const onTokenUpdateHandler = useCallback(() => {
		cognitoAuthorizer.onTokenUpdate(() => {
			setUserData(cognitoAuthorizer.getUserData());
		}, 'onTokenUpdateKey');
	}, []);

	const getCodeFromBrowser = () => {
		const urlSearchParams = new URLSearchParams(window.location.search);
		const params = Object.fromEntries(urlSearchParams.entries());
		const code = params['code'];
		return code;
	};

	const cognitoCode = getCodeFromBrowser();

	useEffect(() => {
		cognitoAuthorizer.init(cognitoCode).then(isAutheticated => {
			console.log(45, isAutheticated);
		});
	}, [cognitoAuthorizer, cognitoCode]);

	useEffect(() => {
		onTokenUpdateHandler();
	}, [onTokenUpdateHandler]);

	return (
		<div className="container">
			<div className="row justify-content-center">
				<div className="card">
					<div className="card-header">
						<a href={LOGIN_COGNITO_URL}> Sign In </a>
					</div>
					<table className="table">
						<thead>
							<tr>
								<th scope="col">Key</th>
								<th scope="col">Value</th>
							</tr>
						</thead>
						<tbody>
							{Object.entries(userData).map(kv => {
								return (
									<tr key={kv[0]}>
										<td>{kv[0]}</td>
										<td>{JSON.stringify(kv[1])}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

export default App;

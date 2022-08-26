import axios from 'axios';
import qs from 'qs';

import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoJwtPayload } from 'aws-jwt-verify/jwt-model';

const SERVER_URL = 'https://cognito-idp.{REGION}.amazonaws.com';
const COGNITO_ACCESS_TOKEN_NAME = 'CognitoAccessToken';
const COGNITO_ID_TOKEN_NAME = 'CognitoIdToken';
const COGNITO_REFRESH_TOKEN_NAME = 'CognitoRefreshToken';

const getTokensFromLocalStorage = () => {
	const accessToken = localStorage.getItem(COGNITO_ACCESS_TOKEN_NAME);
	const idToken = localStorage.getItem(COGNITO_ID_TOKEN_NAME);
	const refreshToken = localStorage.getItem(COGNITO_REFRESH_TOKEN_NAME);
	return { idToken, accessToken, refreshToken };
};

export type UserDataType = {
	[key: string]: any;
	exp: number;
};

export type CognitoObserverInitType = {
	clientId: string;
	pullDomain: string;
	redirectUrl: string;
	region: string;
	userPoolId: string;
};

export class CognitoAuthObserver {
	public isValid = false;
	private clientId: string;
	private redirectUrl: string;
	private region: string;
	private userPoolId: string;
	private cognitoPoolDomain: string;
	private accessToken: string | null = null;
	private idToken: string | null = null;
	private refreshToken: string | null = null;
	private oldAccessToken: string | null = null;
	private debugMode = false;
	userData: UserDataType = { exp: 0 };

	constructor(properties: CognitoObserverInitType) {
		this.clientId = properties.clientId;
		this.redirectUrl = properties.redirectUrl;
		this.region = properties.region;
		this.userPoolId = properties.userPoolId;
		this.cognitoPoolDomain = properties.pullDomain;
		this.init().catch(e => {
			this.logger('error', e);
		});
	}

	private logger = (type: 'log' | 'error', message: any) => {
		if (this.debugMode) {
			if (type === 'log') {
				console.log(message);
			} else {
				console.error(message);
			}
		}
	};

	init = async (code?: string) => {
		this.monitorTokenStatus();
		const hasLocalTokens = this.loadLocalTokens();
		if (hasLocalTokens && this.accessToken && this.idToken) {
			const verifyResultAccessToken = await this.verifyToken(
				this.accessToken,
				'access'
			);
			const verifyResultIdToken = await this.verifyToken(this.idToken, 'id');

			if (verifyResultIdToken['isValid']) {
				this.isValid = true;
				this.saveTokensToLocal();
				this.logger('log', 'Tokens are valid');
			} else {
				this.logger('log', 'Need to update tokens');
				this.refreshTokens().catch(e => {
					this.logger('error', e);
				});
			}
		}

		if (code) {
			return await this.fetchCognitoTokens(code);
		}

		return this.isValid;
	};

	getCognitoPublicKeys = async () => {
		const cognitoServer = SERVER_URL.replace('{REGION}', this.region);
		const urlPath = '.well-known/jwks.json';
		const url = `${cognitoServer}/${this.userPoolId}/${urlPath}`;
		return axios
			.get(url)
			.then(response => {
				const data = response.data;
				const keys = data.keys as [Record<string, any>];
				return keys;
			})
			.catch(e => {
				this.logger('error', e);
				return { status: false };
			});
	};

	fetchCognitoTokens = async (code: string) => {
		const data = {
			grant_type: 'authorization_code',
			client_id: this.clientId,
			redirect_uri: this.redirectUrl,
			code: code,
		};

		const options = {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			data: qs.stringify(data),
			url: this.cognitoPoolDomain + '/oauth2/token',
		};

		const tokensData = await axios(options);

		if (tokensData) {
			this.accessToken = tokensData.data.access_token as string;
			this.idToken = tokensData.data.id_token as string;
			this.refreshToken = tokensData.data.refresh_token as string;
			const { isValid, userData } = await this.verifyToken(this.idToken, 'id');
			if (isValid) {
				this.isValid = true;
				this.userData = userData;
				this.saveTokensToLocal();
				return true;
			}
		} else {
			console.error('ERROR: Failed to get tokens from Cognito');
			return false;
		}
		return false;
	};

	saveTokensToLocal = () => {
		if (this.accessToken) {
			localStorage.setItem(COGNITO_ACCESS_TOKEN_NAME, this.accessToken);
		}
		if (this.idToken) {
			localStorage.removeItem(COGNITO_ID_TOKEN_NAME);
			localStorage.setItem(COGNITO_ID_TOKEN_NAME, this.idToken);
		}
		if (this.refreshToken) {
			localStorage.setItem(COGNITO_REFRESH_TOKEN_NAME, this.refreshToken);
		}
	};

	loadLocalTokens = (): boolean => {
		const { idToken, accessToken, refreshToken } = getTokensFromLocalStorage();
		if (idToken && accessToken && refreshToken) {
			this.accessToken = accessToken;
			this.idToken = idToken;
			this.refreshToken = refreshToken;
			return true;
		}
		return false;
	};

	refreshTokens = async () => {
		/* return {
    access_token: string
    expires_in: number
    id_token:  string
    token_type: string
    }
    */
		this.logger('log', 'Started refresh tokens');
		if (this.refreshToken) {
			const data = {
				grant_type: 'refresh_token',
				client_id: this.clientId,
				redirect_uri: this.redirectUrl,
				refresh_token: this.refreshToken,
			};

			const options = {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				data: qs.stringify(data),
				url: this.cognitoPoolDomain + '/oauth2/token',
			};

			const tokensData = await axios(options);
			if (tokensData && tokensData.data?.id_token) {
				this.accessToken = tokensData.data.access_token;
				this.idToken = tokensData.data.id_token as string;
				const { isValid, userData } = await this.verifyToken(
					this.idToken,
					'id'
				);
				if (isValid) {
					this.isValid = isValid;
					this.userData = userData;
					this.saveTokensToLocal();
					return true;
				}
				return false;
			} else {
				console.error(
					'ERROR: Failed to refresh tokens from Cognito. Possible need to relogin and get new code',
					tokensData
				);
			}
		} else {
			this.clearTokens();
		}
		console.error('ERROR: Failed to refresh tokens from Cognito.');
		return false;
	};

	verifyToken = async (
		token: string,
		type: 'id' | 'access'
	): Promise<{ isValid: boolean; userData: UserDataType }> => {
		let isValid = false;
		try {
			const verifier = CognitoJwtVerifier.create({
				userPoolId: this.userPoolId,
				tokenUse: type, // id || access,
				clientId: this.clientId,
			});

			const payload: CognitoJwtPayload = await verifier.verify(token);

			const isNotExpired = payload.exp > Math.floor(Date.now() / 1000);
			const isCorrectUserPool =
				payload.iss ===
				`https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`;
			const isTokenUseValid = payload.token_use === type;

			isValid = isNotExpired && isCorrectUserPool && isTokenUseValid;

			return { isValid, userData: payload };
		} catch (e) {
			console.log('Token is not valid!', e);
			return { isValid, userData: { exp: 0 } };
		}
	};

	private monitorTokenStatus = () => {
		let attempts = 5;
		let interval = 5 * 1000;

		setInterval(() => {
			if (this.refreshToken) {
				const exp = this.userData.exp;
				const now = Math.floor(Date.now() / 1000);
				if (exp <= now) {
					console.log('Token expired. Refreshing...', exp, now);
					this.refreshTokens()
						.then(result => {
							attempts = result ? 5 : attempts - 1;
						})
						.catch(e => {
							console.error('Failed to refresh tokens', e);
						});
					interval = 10 * 1000;
				} else {
					//TODO fix is lower that 0
					interval = exp - now - 1000 * 100;
				}
			}
			if (attempts === 0) {
				this.refreshToken = null;
			}
		}, interval);
	};

	getAccessToken = (): string | null => {
		return this.accessToken;
	};

	isActive = (): boolean => {
		return this.isValid;
	};

	getIdToken = (): string | null => {
		return this.idToken;
	};

	getRefreshToken = (): string | null => {
		return this.refreshToken;
	};

	getUserPoolDomain = (): string => {
		return this.cognitoPoolDomain;
	};

	getUserPoolId = (): string => {
		return this.userPoolId;
	};

	getClientId = (): string => {
		return this.clientId;
	};

	getUserData = () => {
		return this.userData;
	};

	onTokenUpdate = (callback: (isValid: boolean) => void) => {
		const onStorage = (e: StorageEvent): void => {
			console.log('Checking token status...');
			if (e.storageArea === localStorage && e.key === COGNITO_ID_TOKEN_NAME) {
				if (this.oldAccessToken !== this.accessToken) {
					this.oldAccessToken = this.accessToken;
					callback(this.isValid);
				}
			}
		};
		window.addEventListener('storage', onStorage);

		const getInterval = () => {
			let interval = 10000;

			const exp = this.userData.exp;
			const now = Math.floor(Date.now() / 1000);

			if (exp >= now) {
				interval = exp - now;
			}
			return interval;
		};

		let interval = getInterval();
		setInterval(() => {
			if (this.oldAccessToken !== this.accessToken) {
				this.oldAccessToken = this.accessToken;
				callback(this.isValid);
				interval = getInterval();
			}
		}, interval);
	};

	clearTokens = () => {
		this.accessToken = null;
		this.idToken = null;
		this.refreshToken = null;

		localStorage.removeItem(COGNITO_ACCESS_TOKEN_NAME);
		localStorage.removeItem(COGNITO_ID_TOKEN_NAME);
		localStorage.removeItem(COGNITO_REFRESH_TOKEN_NAME);
	};
}

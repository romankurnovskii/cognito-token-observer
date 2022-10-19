import axios from 'axios';
import qs from 'qs';

import { CognitoJwtVerifier } from 'aws-jwt-verify';
// eslint-disable-next-line node/no-missing-import
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
	poolDomain: string;
	redirectUrl: string;
	region: string;
	userPoolId: string;
};

type SubscriberType = (isValid: boolean) => any;

class CognitoObserver {
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
	private userData: UserDataType = { exp: 0 };
	private subscribers = {} as { [key: string]: SubscriberType };

	constructor(properties: CognitoObserverInitType) {
		this.clientId = properties.clientId;
		this.redirectUrl = properties.redirectUrl;
		this.region = properties.region;
		this.userPoolId = properties.userPoolId;
		this.cognitoPoolDomain = properties.poolDomain;
	}

	private logger = (type: 'log' | 'error', ...message: any[]) => {
		if (this.debugMode) {
			if (type === 'log') {
				console.log(message);
			} else {
				console.error(message);
			}
		}
	};

	private getInterval = () => {
		let interval = 2000;
		const exp = this.userData.exp;
		const now = Math.floor(Date.now() / 1000);
		if (exp >= now) {
			interval = (exp - now) * 1000; // ms * 1000
		}
		return interval;
	};

	private notifySubscribers = () => {
		const isActive = this.isActive();
		for (const subscriber of Object.values(this.subscribers)) {
			try {
				subscriber(isActive);
			} catch {
				continue;
			}
		}
	};

	/**
	 * Starts CognitoObserver setup. If code provided checks if can fetch new tokens.
	 * @constructor
	 * @param {string=} code - cognito response code.
	 */
	init = async (code?: string) => {
		const hasLocalTokens = this.loadLocalTokens();
		if (hasLocalTokens && this.accessToken && this.idToken) {
			// const verifyResultAccessToken = await this.verifyToken(
			// 	this.accessToken,
			// 	'access'
			// );
			const verifyResultIdToken = await this.verifyToken(this.idToken, 'id');

			if (verifyResultIdToken['isValid']) {
				this.isValid = true;
				this.saveTokensToLocal();
				this.logger('log', 'Tokens are valid');
				this.notifySubscribers();
			} else {
				this.logger('log', 'Need to update tokens');
				this.refreshTokens().catch(e => {
					this.logger('error', e);
				});
			}
		}

		if (code) {
			this.fetchCognitoTokens(code)
				.then(isUpdated => {
					if (isUpdated) {
						this.notifySubscribers();
					}
				})
				.catch(() => false);
		}

		this.monitorTokenStatus();
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
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

	refreshTokens = async () => {
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
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

			this.logger('log', { isValid, userData: payload });
			return { isValid, userData: payload };
		} catch (e) {
			console.log('Token is not valid!', e);
			return { isValid, userData: { exp: 0 } };
		}
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

	private monitorTokenStatus = () => {
		let attempts = 5;
		const checkToken = () => {
			clearTimeout(timeoutId);
			if (attempts > 0) {
				timeoutId = setTimeout(checkToken, this.getInterval());
			}

			if (this.refreshToken) {
				const exp = this.userData.exp;
				const now = Math.floor(Date.now() / 1000);
				if (exp <= now) {
					this.logger('log', 'Token expired. Refreshing...');
					this.refreshTokens()
						.then(updated => {
							if (updated) {
								attempts = 5;
								clearTimeout(timeoutId);
								timeoutId = setTimeout(checkToken, this.getInterval());
								this.notifySubscribers();
							} else {
								attempts--;
							}
						})
						.catch(e => {
							console.error('Failed to refresh tokens', e);
							if (attempts <= 0) {
								this.clearTokens();
							}
						});
				}
			} else {
				attempts = 0;
			}
		};

		let timeoutId = setTimeout(checkToken, this.getInterval());
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

	onTokenUpdate = (callback: (isValid: boolean) => void, key: string) => {
		// key need to be unique. Used because of reference from react etc
		// use only unique callbacks
		this.subscribers[key] = callback;

		// this.notifySubscribers();
		const onStorage = (e: StorageEvent): void => {
			console.log('Checking token status...');
			if (e.storageArea === localStorage && e.key === COGNITO_ID_TOKEN_NAME) {
				if (this.oldAccessToken !== this.accessToken) {
					this.oldAccessToken = this.accessToken;
					callback(this.isValid);
					this.notifySubscribers();
				}
			}
		};
		window.addEventListener('storage', onStorage);
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

let instance: any;

/**
 * Creates a singleton CognitoObserver object
 * @constructor
 */
export const CognitoAuthObserver = (
	properties: CognitoObserverInitType
): CognitoObserver => {
	if (instance) {
		return instance;
	}
	instance = new CognitoObserver(properties);
	return instance;
};

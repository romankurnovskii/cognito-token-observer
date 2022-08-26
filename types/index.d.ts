export declare type UserDataType = {
    [key: string]: any;
    exp: number;
};
export declare type CognitoObserverInitType = {
    clientId: string;
    pullDomain: string;
    redirectUrl: string;
    region: string;
    userPoolId: string;
};
export declare class CognitoObserver {
    isValid: boolean;
    private clientId;
    private redirectUrl;
    private region;
    private userPoolId;
    private cognitoPoolDomain;
    private accessToken;
    private idToken;
    private refreshToken;
    private oldAccessToken;
    private debugMode;
    userData: UserDataType;
    constructor(properties: CognitoObserverInitType);
    private logger;
    init: (code?: string) => Promise<boolean>;
    getCognitoPublicKeys: () => Promise<[Record<string, any>] | {
        status: boolean;
    }>;
    fetchCognitoTokens: (code: string) => Promise<boolean>;
    saveTokensToLocal: () => void;
    loadLocalTokens: () => boolean;
    refreshTokens: () => Promise<boolean>;
    verifyToken: (token: string, type: 'id' | 'access') => Promise<{
        isValid: boolean;
        userData: UserDataType;
    }>;
    private monitorTokenStatus;
    getAccessToken: () => string | null;
    isActive: () => boolean;
    getIdToken: () => string | null;
    getRefreshToken: () => string | null;
    getUserPoolDomain: () => string;
    getUserPoolId: () => string;
    getClientId: () => string;
    getUserData: () => UserDataType;
    onTokenUpdate: (callback: (isValid: boolean) => void) => void;
    clearTokens: () => void;
}

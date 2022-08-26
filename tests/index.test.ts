import 'jest-canvas-mock';

import { CognitoAuthObserver } from '../src';

const initData = {
	clientId: 'string',
	pullDomain: 'string',
	redirectUrl: 'string',
	region: 'eu-west-1',
	userPoolId: 'eu-west-1_12345678',
};

describe('Auth Service', () => {
	it('verify token is not valid', async () => {
		const c = new CognitoAuthObserver(initData);
		const { isValid, userData } = await c.verifyToken(
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
			'id'
		);
		expect(isValid).toBe(false);
	});
});

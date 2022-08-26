import { __awaiter, __generator } from "tslib";
import 'jest-canvas-mock';
import { CognitoAuthObserver } from '../src';
var initData = {
    clientId: 'string',
    pullDomain: 'string',
    redirectUrl: 'string',
    region: 'eu-west-1',
    userPoolId: 'eu-west-1_12345678'
};
describe('Auth Service', function () {
    it('verify token is not valid', function () { return __awaiter(void 0, void 0, void 0, function () {
        var c, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    c = new CognitoAuthObserver(initData);
                    _a = expect;
                    return [4 /*yield*/, c.verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', 'id')];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=index.test.js.map
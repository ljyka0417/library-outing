/**
 * 앱의 TypeScript 파일을 Node 에서 불러오기 위한 준비.
 *
 * 달곰이(src/utils/assistant.ts)는 앱 번들 안에서만 도는 코드라, 그대로는 Node 에서
 * 못 부른다. 세 가지를 맞춰 준다.
 *
 *   .ts      sucrase 로 그 자리에서 풀어 읽는다 (이미 설치돼 있다)
 *   @/...    tsconfig 의 경로 별칭을 src/... 로 돌린다
 *   화면 쪽   react 와 저장소(zustand·AsyncStorage)는 달곰이의 답과 상관없어서
 *            빈 껍데기로 바꿔 끼운다. 번역 함수(translate)는 저장소 없이 돈다.
 */
const Module = require('module');
const path = require('path');

require('sucrase/register/ts');

const root = path.resolve(__dirname, '..', '..');
const STUBS = new Set(['react', '@/store/useAppStore']);

const stub = new Proxy(function () {}, {
  get: (_t, key) => (key === '__esModule' ? true : stub),
  apply: () => stub,
});

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (STUBS.has(request)) return request;
  if (request.startsWith('@/')) {
    request = path.join(root, 'src', request.slice(2));
  }
  return originalResolve.call(this, request, parent, ...rest);
};

const originalLoad = Module._load;
Module._load = function (request, parent, ...rest) {
  if (STUBS.has(request)) return stub;
  return originalLoad.call(this, request, parent, ...rest);
};

module.exports = (rel) => require(path.join(root, rel));

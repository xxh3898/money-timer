# Money Timer

현재 급여 주기에서 지금까지 번 돈을 실시간으로 보여주는 React 기반 웹앱입니다. 계산 코어는 웹앱과 VS Code 확장에서 함께 사용합니다.

## 주요 기능

- 연봉, 월급, 시급 기준으로 현재까지 번 돈을 계산합니다.
- 24시간 기준 또는 근무시간 기준으로 누적 방식을 선택할 수 있습니다.
- 급여일, 지급 기준 시간, 근무 요일, 근무 시간, 휴식시간 제외 여부를 설정할 수 있습니다.
- 오늘 번 돈, 이번 급여 주기에서 번 돈, 다음 급여일까지 남은 시간, 진행률을 표시합니다.
- 프라이버시 모드와 라이트/다크/시스템 테마를 제공합니다.

## 웹앱 실행

```bash
npm install
npm run dev
```

## 테스트와 빌드

```bash
npm test
npm run build
```

## VS Code 확장

VS Code 확장은 `extensions/vscode` 아래에 있습니다. 확장 개발 실행과 VSIX 패키징 방법은 [extensions/vscode/README.md](extensions/vscode/README.md)를 참고하세요.

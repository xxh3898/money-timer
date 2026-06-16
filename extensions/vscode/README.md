# Money Timer for VS Code

VS Code 하단 Status Bar에 현재 급여 주기에서 지금까지 번 돈을 작게 표시하는 JavaScript 기반 확장입니다. 기존 Money Timer 웹앱의 순수 계산 코어를 재사용하며, 네트워크 요청·서버·DB·인증·텔레메트리는 포함하지 않습니다.

## 기능

- Status Bar 오른쪽에 현재까지 번 돈을 compact 형식으로 표시합니다.
- 1초마다 `Date.now()` 기준으로 다시 계산해 표시를 갱신합니다.
- Tooltip에서 상세 정보를 확인할 수 있습니다.
  - 현재까지 번 돈
  - 초당 버는 돈
  - 오늘 번 돈
  - 다음 급여일까지 남은 시간
  - 급여 주기 진행률
- 명령 팔레트 명령을 제공합니다.
  - `Money Timer: Configure`
  - `Money Timer: Toggle Visibility`
  - `Money Timer: Show Details`
  - `Money Timer: Reset Settings`

## 실행 방법

1. 저장소 루트에서 의존성을 설치합니다.
2. `extensions/vscode` 폴더로 이동합니다.
3. 아래 명령으로 Extension Development Host를 실행합니다.

```bash
npm run dev
```

또는 VS Code에서 `extensions/vscode` 폴더를 연 뒤 `F5`로 확장 개발 호스트를 실행할 수 있습니다.

## VSIX 패키징 방법

`extensions/vscode` 폴더에서 아래 명령을 실행합니다.

```bash
npm install
npm run package
```

패키징에는 `@vscode/vsce`가 필요합니다. 생성된 `.vsix` 파일은 VS Code의 **Extensions: Install from VSIX...** 명령으로 설치할 수 있습니다.

## 설정 방법

명령 팔레트에서 `Money Timer: Configure`를 실행하면 QuickPick/InputBox를 통해 아래 값을 설정할 수 있습니다.

- 계산 방식: `annual`, `monthly`, `hourly`
- 연봉, 월급, 시급
- 세금 모드: `net`, `gross`
- 급여일과 급여 지급 시간
- 누적 모드: `always`, `worktime`
- 근무 요일
- 근무 시작/종료 시간

설정은 VS Code의 `context.globalState`에 `moneyTimerSettings` 키로 저장됩니다. 잘못된 값은 기본 설정으로 보정됩니다.

## 사용 주의

이 확장은 개인 생산성 참고용입니다. 회사 정책, 보안 정책, 근무 규정에 맞는 범위에서만 사용하세요. 보안 우회, 프로세스 위장, 감시 회피 목적의 기능은 제공하지 않습니다.

# Money Timer for VS Code

![Money Timer 아이콘](assets/icon.png)

Money Timer는 VS Code 하단 Status Bar에서 현재 급여 주기에 지금까지 번 돈을 보여주는 무료 local-only 공개 베타입니다.

계정 가입이나 서버 전송 없이 VS Code 안에 설정을 저장합니다. 세금과 공제액은 추정하지 않으며 사용자가 입력한 실제 수령액을 기준으로 계산합니다.

## 설치

1. VS Code에서 Extensions 화면을 엽니다.
2. `Money Timer`를 검색합니다.
3. publisher가 `xxh3898`인지 확인합니다.
4. **Install**을 선택합니다.

설치가 끝나면 Status Bar 오른쪽에 Money Timer가 표시됩니다.

## 처음 시작하기

1. Command Palette를 엽니다.
2. `Money Timer: Configure`를 실행합니다.
3. 급여 기준과 실제 수령액을 입력합니다.
4. 급여일, 지급 기준 시간과 돈이 증가하는 방식을 선택합니다.
5. 필요하면 근무 요일, 근무시간, 휴식시간과 프라이버시 모드를 설정합니다.

설정을 저장하면 Status Bar와 Tooltip에서 현재 급여 주기 정보를 확인할 수 있습니다.

## 기능

- Status Bar에 현재까지 번 돈을 간결하게 표시합니다.
- Tooltip과 상세 보기에서 아래 정보를 확인할 수 있습니다.
  - 현재까지 번 돈
  - 초당 버는 돈
  - 오늘 번 돈
  - 다음 급여일까지 남은 시간
  - 급여 주기 진행률
- 프라이버시 모드에서 Status Bar, Tooltip과 상세 보기의 금액을 가립니다.
- 목표 금액을 추가, 수정, 표시/숨김 전환, 삭제할 수 있습니다.
- 목표별 달성률, 남은 금액, 남은 시간을 Tooltip과 상세 보기에서 확인할 수 있습니다.
- 소비 금액을 입력해 현재 초당 수익 기준과 평균 초당 수익 기준의 노동시간으로 환산할 수 있습니다.
- 근무시간과 휴식시간 제외 설정을 계산에 반영합니다.

## 명령

| 명령 | 기능 |
| --- | --- |
| `Money Timer: Configure` | 급여와 근무 설정 변경 |
| `Money Timer: Toggle Visibility` | Status Bar 표시 전환 |
| `Money Timer: Show Details` | 급여 주기 상세 정보 확인 |
| `Money Timer: Manage Goals` | 목표 추가, 수정, 숨김, 삭제 |
| `Money Timer: Calculate Labor Time` | 소비 금액의 노동시간 환산 |
| `Money Timer: Reset Settings` | Money Timer 설정 초기화 |

## 설정 방법

`Money Timer: Configure`에서 아래 값을 설정할 수 있습니다.

- 계산 방식: `annual`, `monthly`, `hourly`
- 연 실수령액, 월 실수령액, 실수령 시급
- 급여일과 급여 지급 시간
- 누적 모드: `always`, `worktime`
- 프라이버시 모드
- 휴식시간 제외
- 근무 요일
- 근무 시작/종료 시간

휴식시간은 `12:00-13:00,18:00-18:30`처럼 `HH:mm-HH:mm` 형식으로 입력하고 여러 개는 쉼표로 구분합니다. 중복되거나 겹치거나 맞닿은 구간은 하나로 합쳐 한 번만 제외합니다.

## 데이터와 개인정보

- 설정과 목표는 VS Code 내부 로컬 저장소에 보관합니다.
- 서버, 계정, 외부 동기화, 결제, 텔레메트리를 사용하지 않습니다.
- 확장을 삭제하거나 VS Code 사용자 데이터를 초기화하면 설정을 잃을 수 있습니다.
- 현재 버전은 설정 export와 import를 제공하지 않습니다.

## 계산 기준과 주의사항

- 실제로 받는 연·월·시급을 입력해야 합니다.
- Money Timer는 세금, 공제, 상여, 수당을 계산하거나 검증하지 않습니다.
- 계산 결과는 개인 생산성 참고용이며 급여 명세서나 법적 근거로 사용할 수 없습니다.
- 회사 정책, 보안 정책과 근무 규정에 맞는 범위에서 사용해야 합니다.

## 지원과 라이선스

- 버그와 개선 제안: [GitHub Issues](https://github.com/xxh3898/money-timer/issues)
- 지원 범위와 문제 보고 방법: [SUPPORT.md](SUPPORT.md)
- 변경 내역: [CHANGELOG.md](CHANGELOG.md)
- 라이선스: [MIT](LICENSE)

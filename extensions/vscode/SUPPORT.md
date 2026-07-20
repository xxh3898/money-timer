# Money Timer 지원 안내

## 문제 보고

버그와 개선 제안은 [GitHub Issues](https://github.com/xxh3898/money-timer/issues)에 등록해 주세요.

문제를 재현하는 데 필요한 아래 정보를 함께 남겨 주세요.

- Money Timer 확장 버전
- VS Code 버전과 운영체제
- 실행한 명령과 예상 결과
- 실제 결과와 오류 메시지
- 재현 순서

급여, 목표 금액, 경로, 계정 정보처럼 민감할 수 있는 값은 제거하거나 마스킹한 뒤 등록해 주세요.

## 데이터와 개인정보

Money Timer는 설정과 목표를 VS Code의 `context.globalState`에 저장합니다. 서버, 계정, 외부 동기화, 텔레메트리를 사용하지 않습니다.

확장을 제거하거나 VS Code 사용자 데이터를 초기화하기 전에 필요한 설정을 별도로 기록해 주세요. 현재 버전은 설정 export와 import를 제공하지 않습니다.

## 지원 범위

- 공개 베타에서는 기능 오류와 재현 가능한 호환성 문제를 우선 확인합니다.
- 회사 급여 규정, 세금, 공제액을 계산하거나 검증하지 않습니다.
- Marketplace publisher 계정이나 VS Code 자체 문제는 Microsoft 공식 지원 범위를 따라야 할 수 있습니다.

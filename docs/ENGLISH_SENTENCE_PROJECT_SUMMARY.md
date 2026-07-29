# 📄 [vpe.co.kr] EnglishSentence 페이지 및 시스템 작업 개요 요약

이 문서는 **vpe.co.kr** 웹 프로젝트의 구조, 오늘 추가된 `EnglishSentence` 기능 및 구글 스프레드시트 실시간 연동 시스템을 나중에도 쉽게 참고할 수 있도록 정리한 요약 문서입니다.

---

## 1. 🌐 서비스 및 기술 환경 정보

- **웹 서비스 주소**: [https://vpe.co.kr](https://vpe.co.kr)
- **신규 페이지 주소**: [https://vpe.co.kr/english-sentence](https://vpe.co.kr/english-sentence)
- **GitHub 저장소**: `https://github.com/hanjaeduc/google-blog.git` (main 브랜치)
- **웹 호스팅 & 배포**: Vercel (GitHub `main` 브랜치에 코드 푸시 시 100% 자동 배포)
- **기술 스택**: Next.js 16 (React 19, TypeScript), CSS Modules, Google Sheets CSV Sync

---

## 2. 🚀 오늘 완성한 작업 요약

### 1) 신규 메뉴 및 페이지 추가 (`EnglishSentence`)
- **상단 네비게이션 위치**: `GermanSigns` ➡️ **`EnglishSentence`** ➡️ `PRIVATE`
- **암호 설정**: 기존 비밀번호 절차를 제거하여 접속 시 바로 내용 확인 가능.
- **디자인 & 헤더**: 깔끔하게 `EnglishSentence` 타이틀만 노출.

### 2) 구글 스프레드시트 `시트4` 실시간 100% 동기화
- **연동 시트**: `단어장2026-01-23` 문서의 **`시트4`** (`gid=204579350`)
- **작성 방식**: A열의 1행(A1 셀)=`1번` 카드, 2행(A2 셀)=`2번` 카드, 3행(A3 셀)=`3번` 카드 ...
- **실시간성**: `cache: 'no-store'` 및 `force-dynamic` 설정으로 구글 시트에서 수정/삭제/추가 후 새로고침 시 지연 없이 웹사이트에 바로 반영.

### 3) 카드별 편의 기능
- **순번 라벨**: `1번`, `2번`, `3번` ... 깔끔한 라벨링
- **줄바꿈 보존**: 셀 내부의 엔터/줄바꿈 서식 100% 유지
- **📋 클립보드 복사**: 클릭 한 번으로 해당 셀 문장 전체 복사
- **🔍 실시간 검색창**: 문장이 많아졌을 때 특정 단어나 한글 뜻 실시간 필터링

---

## 3. 💡 앞으로 사용 및 관리 방법 (사용자 가이드)

1. **새 영어 문장 추가하기**:
   - 구글 스프레드시트 `단어장2026-01-23` ➡️ **`시트4`** 탭에 들어갑니다.
   - **A열 4행(A4), 5행(A5)** 아래로 새 글을 작성합니다.
   - 웹사이트([https://vpe.co.kr/english-sentence](https://vpe.co.kr/english-sentence))에서 새로고침하면 `4번`, `5번` 카드가 즉시 자동으로 올라옵니다.

2. **소스코드 변경 시 배포 방법**:
   - 로컬에서 코드/디자인을 수정한 후 Terminal에서 다음 3줄만 실행:
     ```bash
     git add .
     git commit -m "수정 내용 요약"
     git push origin main
     ```
   - 1~2분 뒤 Vercel이 자동으로 웹사이트에 반영합니다.

3. **주의 사항**:
   - GitHub 저장소는 Vercel 배포의 원본 보관소이므로 삭제하지 않고 보존해야 합니다.

---
*작성일: 2026년 7월 29일*

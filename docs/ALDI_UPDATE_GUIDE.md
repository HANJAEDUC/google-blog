# Aldi 가격표 업데이트 가이드

## 🎯 3가지 업데이트 방법

### 1️⃣ **자동 업데이트 (추천) - GitHub Actions**
매주 월요일 새벽 2시(UTC)에 자동으로 크롤링하고 배포합니다.

**작동 방식:**
- GitHub Actions가 자동으로 크롤러 실행
- 데이터를 `scripts/aldi_offers.json`에 저장
- 변경사항을 자동으로 커밋 & 푸시
- Vercel이 자동으로 감지하여 재배포

**장점:**
✅ 완전 자동화 - 아무것도 안 해도 됨
✅ 맥미니, 노트북 상관없음
✅ 매주 정기적으로 업데이트

**설정:**
이미 `.github/workflows/update-aldi-offers.yml` 파일이 생성되었습니다.
GitHub에 푸시하면 자동으로 작동합니다!

---

### 2️⃣ **웹에서 버튼 클릭 업데이트**
웹사이트에서 "지금 업데이트" 버튼을 클릭하면 즉시 크롤링합니다.

**작동 방식:**
1. https://your-site.com/aldi 페이지 방문
2. 헤더의 "지금 업데이트" 버튼 클릭
3. 크롤링 완료 후 페이지 자동 새로고침

**장점:**
✅ 언제든지 수동으로 업데이트 가능
✅ 새로운 특가가 나왔을 때 즉시 반영
✅ 웹 브라우저만 있으면 OK

**주의:**
⚠️ Vercel의 서버리스 함수는 최대 실행 시간 제한이 있습니다 (무료: 10초, Pro: 60초)
⚠️ 크롤링이 오래 걸리면 타임아웃될 수 있습니다

---

### 3️⃣ **수동 실행 (로컬 컴퓨터)**
맥미니나 노트북에서 직접 크롤러를 실행합니다.

**작동 방식:**
```bash
# 1. 프로젝트 폴더로 이동
cd google-blog

# 2. 크롤러 실행
node scripts/crawl_aldi.js

# 3. Git에 커밋 & 푸시
git add scripts/aldi_offers.json
git commit -m "Update Aldi offers"
git push

# 4. Vercel이 자동으로 재배포
```

**장점:**
✅ 가장 확실한 방법
✅ 로컬에서 바로 확인 가능
✅ 실행 시간 제한 없음

**단점:**
❌ 컴퓨터가 켜져 있어야 함
❌ 매번 수동으로 실행해야 함

---

## 🔄 워크플로우 비교

| 방법 | 자동화 | 위치 | 실행시간 | 추천도 |
|------|--------|------|----------|--------|
| GitHub Actions | ✅ 자동 | GitHub 서버 | 제한없음 | ⭐⭐⭐⭐⭐ |
| 웹 버튼 | ❌ 수동 | Vercel 서버 | 10~60초 | ⭐⭐⭐ |
| 로컬 실행 | ❌ 수동 | 내 컴퓨터 | 제한없음 | ⭐⭐ |

---

## 🚀 권장 설정

### **맥미니 + 노트북 환경에서 최적의 방법:**

1. **기본: GitHub Actions 자동화**
   - 매주 자동으로 업데이트됨
   - 아무것도 안 해도 OK

2. **긴급 상황: 웹 버튼 클릭**
   - 새로운 특가가 갑자기 나왔을 때
   - 브라우저로 바로 업데이트

3. **백업: 로컬 실행**
   - GitHub Actions가 실패했을 때
   - 데이터를 직접 확인하고 싶을 때

---

## 📁 파일 구조

```
google-blog/
├── .github/
│   └── workflows/
│       └── update-aldi-offers.yml  # GitHub Actions 설정
├── app/
│   ├── api/
│   │   └── crawl-aldi/
│   │       └── route.ts            # API 엔드포인트
│   └── aldi/
│       ├── page.tsx                # 서버 컴포넌트
│       ├── AldiClient.tsx          # 클라이언트 컴포넌트 (버튼 포함)
│       └── aldi.module.css         # 스타일
└── scripts/
    ├── crawl_aldi.js               # 크롤러 스크립트
    └── aldi_offers.json            # 크롤링된 데이터
```

---

## ✅ 다음 단계

1. **GitHub에 푸시**
   ```bash
   git add .
   git commit -m "Add auto-update workflow for Aldi offers"
   git push
   ```

2. **GitHub Actions 확인**
   - GitHub 저장소 → Actions 탭에서 워크플로우 확인
   - 수동으로 테스트: "Run workflow" 버튼 클릭

3. **웹사이트에서 테스트**
   - 배포 후 https://your-site.com/aldi 방문
   - "지금 업데이트" 버튼 테스트

---

## 🛠️ 문제 해결

**Q: GitHub Actions가 실행되지 않아요**
- GitHub 저장소 → Settings → Actions → "Allow all actions" 확인

**Q: 웹 버튼 클릭이 타임아웃돼요**
- Vercel Pro 플랜 사용 또는 로컬 실행 사용

**Q: 데이터가 업데이트되지 않아요**
- `aldi_offers.json` 파일의 `lastUpdated` 확인
- GitHub Actions 로그 확인

---

## 📝 참고사항

- Aldi 웹사이트 구조가 변경되면 크롤러 업데이트 필요
- 매주 월요일에 새로운 특가가 시작됨
- `offerPeriod`가 자동으로 추출되지 않으면 수동 업데이트 필요

# -*- coding: utf-8 -*-
"""
Generate Top-Down Supply & Demand Trading Guidebook PDF
Converts rich HTML to PDF using Chrome Headless.
"""
import os
import subprocess

HTML_CONTENT = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>탑다운(Top-Down) 수급매매 완성 가이드북</title>
<style>
  @page {
    size: A4;
    margin: 18mm 15mm;
  }
  
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
    color: #1e293b;
    line-height: 1.6;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
    background-color: #ffffff;
  }

  /* Cover Page */
  .cover {
    height: 100%;
    min-height: 960px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px 20px 40px 20px;
    page-break-after: always;
    border-bottom: 3px solid #2563eb;
  }
  .cover-header {
    border-left: 6px solid #2563eb;
    padding-left: 18px;
  }
  .cover-badge {
    display: inline-block;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 11pt;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 6px;
    margin-bottom: 16px;
    letter-spacing: -0.5px;
  }
  .cover-title {
    font-size: 28pt;
    font-weight: 900;
    color: #0f172a;
    line-height: 1.25;
    margin: 0 0 16px 0;
    letter-spacing: -1px;
  }
  .cover-subtitle {
    font-size: 13pt;
    color: #475569;
    font-weight: 500;
    line-height: 1.5;
    margin: 0;
  }
  .cover-diagram {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    margin: 40px 0;
  }
  .diagram-step {
    display: flex;
    align-items: center;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 12px 18px;
    margin-bottom: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .step-num {
    background: #2563eb;
    color: #ffffff;
    font-weight: 800;
    font-size: 11pt;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 14px;
    flex-shrink: 0;
  }
  .step-content {
    flex: 1;
  }
  .step-title {
    font-size: 11pt;
    font-weight: 700;
    color: #0f172a;
  }
  .step-desc {
    font-size: 9.5pt;
    color: #64748b;
    margin-top: 2px;
  }
  .arrow-down {
    text-align: center;
    font-size: 14pt;
    color: #94a3b8;
    margin: -4px 0 6px 0;
    font-weight: bold;
  }
  .cover-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px solid #e2e8f0;
    padding-top: 20px;
    font-size: 9.5pt;
    color: #64748b;
  }
  .cover-footer strong {
    color: #0f172a;
  }

  /* Content Pages */
  .page {
    page-break-after: always;
    padding-top: 10px;
  }
  .page:last-child {
    page-break-after: avoid;
  }

  /* Headings */
  h1 {
    font-size: 18pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 8px;
    margin-top: 0;
    margin-bottom: 18px;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h2 {
    font-size: 13pt;
    font-weight: 700;
    color: #1e3a8a;
    margin-top: 22px;
    margin-bottom: 10px;
    border-left: 4px solid #3b82f6;
    padding-left: 10px;
    letter-spacing: -0.3px;
  }
  h3 {
    font-size: 11pt;
    font-weight: 700;
    color: #334155;
    margin-top: 16px;
    margin-bottom: 6px;
  }

  /* Paragraphs & Lists */
  p {
    margin: 0 0 10px 0;
    text-align: justify;
  }
  ul, ol {
    margin: 0 0 12px 0;
    padding-left: 20px;
  }
  li {
    margin-bottom: 5px;
  }

  /* Callout Boxes */
  .callout {
    border-radius: 8px;
    padding: 14px 16px;
    margin: 14px 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  .callout-blue {
    background-color: #eff6ff;
    border-left: 4px solid #2563eb;
    color: #1e3a8a;
  }
  .callout-emerald {
    background-color: #ecfdf5;
    border-left: 4px solid #10b981;
    color: #064e3b;
  }
  .callout-amber {
    background-color: #fffbeb;
    border-left: 4px solid #f59e0b;
    color: #78350f;
  }
  .callout-title {
    font-weight: 800;
    font-size: 10.5pt;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  th {
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    text-align: center;
  }
  td {
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    color: #334155;
  }
  tr:nth-child(even) td {
    background-color: #f8fafc;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .font-bold { font-weight: 700; }
  .text-red { color: #dc2626; font-weight: 700; }
  .text-blue { color: #2563eb; font-weight: 700; }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 8.5pt;
    font-weight: 700;
  }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-purple { background: #ede9fe; color: #5b21b6; }
  .badge-orange { background: #ffedd5; color: #9a3412; }

  /* Grid Cards */
  .card-grid {
    display: flex;
    gap: 12px;
    margin: 14px 0;
    page-break-inside: avoid;
  }
  .card {
    flex: 1;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .card-header {
    font-weight: 800;
    font-size: 10.5pt;
    color: #0f172a;
    margin-bottom: 6px;
    border-bottom: 1px dashed #cbd5e1;
    padding-bottom: 6px;
  }

  /* Metric Formula Box */
  .formula-box {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 10px 14px;
    font-family: "Consolas", "Courier New", monospace;
    font-size: 9.5pt;
    color: #0f172a;
    margin: 8px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fafafa;
  }

  .footer-note {
    font-size: 8.5pt;
    color: #94a3b8;
    text-align: right;
    margin-top: 15px;
    border-top: 1px solid #f1f5f9;
    padding-top: 6px;
  }
</style>
</head>
<body>

  <!-- ==================== COVER PAGE ==================== -->
  <div class="cover">
    <div>
      <div class="cover-header">
        <span class="cover-badge">실전 수급 분석 전략 가이드</span>
        <h1 class="cover-title">탑다운(Top-Down)<br>수급 매매 완성 가이드북</h1>
        <p class="cover-subtitle">
          주도 업종 선별부터 10일 수급강도, 외인 지분 추세, 단기 쌍끌이 타점까지<br>
          스마트머니(외국인·기관)의 자금 흐름을 추종하는 4단계 실전 파이프라인
        </p>
      </div>

      <div class="cover-diagram">
        <div style="font-weight: 800; color: #0f172a; margin-bottom: 14px; font-size: 11pt;">
          🎯 4단계 탑다운 깔때기(Funnel) 수급 매매 시스템
        </div>

        <div class="diagram-step">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">🏢 Part 8: 코스피 업종 강도 (3대 지표)</div>
            <div class="step-desc">업종 등락률 + 상승 종목 비율 + 거래대금 증가율로 시장을 이끄는 <strong>주도 업종 & Top 3 대장주</strong> 선별</div>
          </div>
        </div>

        <div class="arrow-down">▼</div>

        <div class="diagram-step">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">🔥 Part 7: 10일 수급강도 (코스피 20 / 코스닥 20)</div>
            <div class="step-desc">10일간 거래량 대비 순매수 강도 및 <strong>10일 이동평균선(MA10) 지지</strong> 여부 필터링</div>
          </div>
        </div>

        <div class="arrow-down">▼</div>

        <div class="diagram-step">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">📈 Part 5: 외인 지분율 상승 + 3일 기관 동반 유입</div>
            <div class="step-desc">20일간 외인 지분율 우상향 추세 속에서 최근 3일간 기관이 받쳐주는 <strong>Smart Money</strong> 포착</div>
          </div>
        </div>

        <div class="arrow-down">▼</div>

        <div class="diagram-step">
          <div class="step-num">4</div>
          <div class="step-content">
            <div class="step-title">🕵️ Part 3: 3일 이상 연속 순매집 (쌍끌이 타점)</div>
            <div class="step-desc">외인 또는 기관의 3일~5일 연속 매집 및 <strong>외인·기관 동시 순매수</strong> 최종 매수 타점 확정</div>
          </div>
        </div>
      </div>
    </div>

    <div class="cover-footer">
      <div>
        <strong>전용 분석 대시보드</strong>: <a href="https://www.vpe.co.kr/private" style="color: #2563eb; text-decoration: none;">www.vpe.co.kr/private</a> (암호: 1147)<br>
        <strong>분석 대상</strong>: KOSPI / KOSDAQ 전종목 (KRX & 네이버 금융 연동)
      </div>
      <div style="text-align: right;">
        발행일: 2026년 11월<br>
        <strong>VPE 수급 리서치 센터</strong>
      </div>
    </div>
  </div>

  <!-- ==================== PAGE 1 ==================== -->
  <div class="page">
    <h1>1. 탑다운 수급 매매의 철학과 핵심 원리</h1>

    <h2>1.1 왜 수급(외국인·기관)을 추종해야 하는가?</h2>
    <p>
      주식 시장의 주가를 결정짓는 본질은 <strong>자금의 크기(Money Power)</strong>와 <strong>정보의 우위</strong>입니다.
      대한민국 주식 시장에서 시장을 주도하고 추세를 만들어내는 주체는 개인투자자가 아닌 <strong>외국인과 기관</strong>입니다.
    </p>
    <ul>
      <li><strong>스마트머니의 성격</strong>: 외국인과 기관은 기업의 실적 전망, 신제품 출시, 정책 수혜 등을 사전에 철저히 분석하고 대규모 자금을 장기간 분할 투입합니다.</li>
      <li><strong>주가 방어력</strong>: 세력이 물량을 쥐고 있는 종목은 지수가 흔들려도 이동평균선(5일선, 10일선)에서 강력한 지지가 나옵니다.</li>
      <li><strong>추세 추종의 안전성</strong>: 바닥을 점치며 떨어지는 칼날을 잡는 역추세 매매 대신, 큰 손들이 돈을 쏟아붓는 주도주에 올라타는 것이 승률과 회전율을 극대화하는 유일한 길입니다.</li>
    </ul>

    <h2>1.2 숲을 보고 나무를 고르는 '탑다운(Top-Down)'의 법칙</h2>
    <p>
      개별 종목의 차트나 호재만 보고 진입하면 시장 전체의 자금 흐름에 역행하여 고점에 물리기 쉽습니다.
      성공적인 수급 매매는 반드시 <strong>시장(Market) → 업종(Sector) → 주도주(Leader) → 타점(Timing)</strong>의 순서로 좁혀 내려가야 합니다.
    </p>

    <div class="callout callout-blue">
      <div class="callout-title">💡 탑다운 깔때기 분석 3대 원칙</div>
      <ol style="margin-bottom: 0;">
        <li><strong>업종이 살아야 종목이 산다</strong>: 돈이 몰리는 주도 업종 내에서는 2등주, 3등주도 오르지만, 소외된 업종에서는 아무리 좋은 호재가 있어도 상승 탄력이 둔화됩니다.</li>
        <li><strong>대장주를 매매하라</strong>: 돈이 가장 많이 터진(거래대금 최상위) 대장주가 가장 먼저 치고 나가고, 지수 조정 시 가장 늦게 빠집니다.</li>
        <li><strong>중기 지분과 단기 수급이 일치할 때 폭발한다</strong>: 20일간 외인이 꾸준히 매집해 온 종목에 기관이 3일 연속 동반 유입되고, 당일 쌍끌이가 터질 때 최강의 수익률이 발생합니다.</li>
      </ol>
    </div>

    <h2>1.3 4개 파트의 역할 및 상호 보완 관계</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 15%;">구분</th>
          <th style="width: 25%;">파트명 (대시보드)</th>
          <th style="width: 20%;">핵심 관찰 주기</th>
          <th>주요 역할 및 매매 시너지</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center font-bold">1단계</td>
          <td><span class="badge badge-purple">Part 8</span> 코스피 업종 강도</td>
          <td class="text-center">당일 장마감 (1일)</td>
          <td>돈이 들어온 <strong>주도 업종</strong>과 업종 내 <strong>1~3위 대장주</strong> 선별 (숲의 발견)</td>
        </tr>
        <tr>
          <td class="text-center font-bold">2단계</td>
          <td><span class="badge badge-orange">Part 7</span> 10일 수급 강도</td>
          <td class="text-center">최근 10거래일 누적</td>
          <td>총거래량 대비 순매수 비중(수급밀도) 상위권 확인 및 <strong>10일 이평선(MA10) 지지</strong> 검증</td>
        </tr>
        <tr>
          <td class="text-center font-bold">3단계</td>
          <td><span class="badge badge-green">Part 5</span> 외인지분↑ + 3일기관</td>
          <td class="text-center">중기 20일 + 단기 3일</td>
          <td>외인의 중기 지분율 우상향 추세와 기관의 신규 가세(Smart Money) 확인</td>
        </tr>
        <tr>
          <td class="text-center font-bold">4단계</td>
          <td><span class="badge badge-blue">Part 3</span> 연속 순매집</td>
          <td class="text-center">최근 3일~5일</td>
          <td>외인·기관 쌍끌이 연속 매집 종목 포착을 통한 <strong>정밀 매수 타점</strong> 확정</td>
        </tr>
      </tbody>
    </table>
    <div class="footer-note">VPE 수급 매매 실전 전략 가이드 | 1 / 4 Page</div>
  </div>

  <!-- ==================== PAGE 2 ==================== -->
  <div class="page">
    <h1>2. Part 8: 코스피 업종 강도 분석 (3대 핵심 지표)</h1>

    <p>
      장 마감 직후 가장 먼저 확인해야 하는 화면입니다. 네이버 금융의 79개 업종 그룹 데이터를 기반으로 코스피 상장 종목만을 엄격히 필터링하여 시장 주도권을 쥔 업종을 포착합니다.
    </p>

    <h2>2.1 업종 강도를 평가하는 3대 지표</h2>

    <div class="card-grid">
      <div class="card">
        <div class="card-header">📊 지표 1: 업종 등락률 (%)</div>
        <p style="font-size: 9pt; color: #475569; margin: 4px 0 8px 0;">
          업종 전체 시가총액 가중 등락률로 당일 시장의 가격 모멘텀을 나타냅니다.
        </p>
        <div class="formula-box">네이버 금융 업종 공식 등락률</div>
        <p style="font-size: 8.5pt; color: #64748b; margin-top: 6px;">
          • 지수 대비 상대 강도(+1.5% 이상 우수)<br>
          • 단독 대형주 왜곡 가능성에 주의
        </p>
      </div>

      <div class="card">
        <div class="card-header">📈 지표 2: 상승 종목 비율 (%)</div>
        <p style="font-size: 9pt; color: #475569; margin: 4px 0 8px 0;">
          특정 1개 종목의 착시를 방지하고, 업종 내 종목들의 고른 온기를 평가합니다.
        </p>
        <div class="formula-box">(상승 종목수 ÷ 유효 종목수) × 100</div>
        <p style="font-size: 8.5pt; color: #64748b; margin-top: 6px;">
          • <strong>60% 이상</strong>: 업종 전반의 매수세 유입<br>
          • <strong>75% 이상</strong>: 강력한 테마/섹터 랠리
        </p>
      </div>

      <div class="card">
        <div class="card-header">💰 지표 3: 거래대금 증가율 (%)</div>
        <p style="font-size: 9pt; color: #475569; margin: 4px 0 8px 0;">
          단기 가격 상승이 아닌, 시장 자금이 실제로 해당 섹터로 이동했는지 확인합니다.
        </p>
        <div class="formula-box">(당일 거래대금 ÷ 20일평균 - 1) × 100</div>
        <p style="font-size: 8.5pt; color: #64748b; margin-top: 6px;">
          • <strong>+20% 이상</strong>: 기관/외인 신규 자금 유입<br>
          • <strong>+50% 이상</strong>: 주도 섹터 교체 신호
        </p>
      </div>
    </div>

    <h2>2.2 대장주(Leader) 1~3위 판별법</h2>
    <p>
      각 업종 내에서 <strong>당일 거래대금이 가장 큰 상위 3개 종목</strong>을 자동으로 추출합니다. 
      상승률 1위가 아니라 <strong>거래대금 1위가 진짜 대장주</strong>입니다.
    </p>
    <ul>
      <li><strong>1위 대장주</strong>: 기관·외인의 최대 자금이 집결된 종목으로, 해당 섹터의 방향타 역할을 수행합니다.</li>
      <li><strong>2·3위 후발주</strong>: 대장주가 먼저 상한가나 고점에 도달했을 때 후속 갭을 메우는 트레이딩 타겟이 됩니다.</li>
    </ul>

    <h2>2.3 실전 상위 주도업종 평가 사례 (2026.10.30 기준)</h2>
    <table>
      <thead>
        <tr>
          <th>순위</th>
          <th>업종명</th>
          <th>업종 등락률</th>
          <th>상승 종목 비율</th>
          <th>20일 대비 거래대금</th>
          <th>1위 대장주 (당일 등락률 / 거래대금)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center font-bold">🥇 1위</td>
          <td class="font-bold">해운사</td>
          <td class="text-center text-red">+2.73%</td>
          <td class="text-center font-bold">75.0% (3/4개)</td>
          <td class="text-center text-red">+13.1%</td>
          <td>대한해운 (<span class="text-red">+6.03%</span> / 452억)</td>
        </tr>
        <tr>
          <td class="text-center font-bold">🥈 2위</td>
          <td class="font-bold">음료</td>
          <td class="text-center text-red">+1.85%</td>
          <td class="text-center font-bold">71.4% (5/7개)</td>
          <td class="text-center text-red">+44.7%</td>
          <td>하이트진로 (<span class="text-red">+2.83%</span> / 389억)</td>
        </tr>
        <tr>
          <td class="text-center font-bold">🥉 3위</td>
          <td class="font-bold">제약</td>
          <td class="text-center text-red">+1.35%</td>
          <td class="text-center font-bold">59.3% (67/113개)</td>
          <td class="text-center text-red">+28.5%</td>
          <td>유한양행 (<span class="text-red">+3.20%</span> / 1,420억)</td>
        </tr>
      </tbody>
    </table>

    <div class="callout callout-emerald">
      <div class="callout-title">✅ 주도 업종 합격 체크리스트</div>
      <p style="margin: 0; font-size: 9.5pt;">
        [1] 업종 등락률이 코스피 지수 대비 +1.0% 이상 상회하는가?<br>
        [2] 상승 종목 비율이 60% 이상으로 섹터 전반에 매수세가 확산되었는가?<br>
        [3] 20일 평균 거래대금 대비 당일 거래대금이 플러스(+) 증가하였는가?<br>
        <strong>→ 3개 조건을 모두 만족할 때 비로소 '금일의 주도 섹터'로 판정합니다.</strong>
      </p>
    </div>
    <div class="footer-note">VPE 수급 매매 실전 전략 가이드 | 2 / 4 Page</div>
  </div>

  <!-- ==================== PAGE 3 ==================== -->
  <div class="page">
    <h1>3. Part 7: 10일 수급강도 및 10일선 지지 검증</h1>

    <p>
      주도 업종과 대장주를 찾았다면, 해당 종목이 최근 10거래일 동안 <strong>세력의 매집 밀도</strong>가 얼마나 높은지, 
      그리고 세력의 단기 매입 단가인 <strong>10일 이동평균선(MA10) 위에서 지지를 받고 있는지</strong> 확인합니다.
    </p>

    <h2>3.1 10일 수급강도 산출 공식 및 의미</h2>
    <div class="formula-box">
      수급강도(%) = [(10일 외국인 순매수량 + 10일 기관 순매수량) ÷ 10일 총 누적거래량] × 100
    </div>
    <p>
      단순 순매수 금액만 보면 시가총액이 큰 종목이 항상 상위에 랭크됩니다. 하지만 수급강도는 <strong>총 거래량 중에서 외인과 기관이 사 모은 비율</strong>을 계산하므로, 
      <strong>세력이 유통 주식을 얼마나 강하게 장악(Lock-in)하고 있는지</strong>를 정밀하게 보여줍니다.
    </p>
    <ul>
      <li><strong>수급강도 +10% 이상</strong>: 매우 강력한 매집. 유통물량의 상당수가 큰 손 금고로 잠김.</li>
      <li><strong>수급강도 +5% ~ +10%</strong>: 안정적인 우상향 매집 구간.</li>
      <li><strong>순매도(-) 강도 상위</strong>: 세력의 차익 실현 폭탄이 쏟아지는 구간이므로 즉시 제외.</li>
    </ul>

    <h2>3.2 10일 이동평균선(MA10) 지지의 중요성</h2>
    <p>
      10일선은 스윙 매매에서 <strong>세력의 심리적 마지노선이자 평균 매집 원가선</strong>입니다. 
      수급강도가 아무리 높아도 주가가 10일선 아래로 역배열 하락 중이라면 물량을 털어내는 페이크일 수 있습니다.
    </p>
    <div class="callout callout-amber">
      <div class="callout-title">⚠️ MA10 지지 상태 판정 기준</div>
      <p style="margin: 0; font-size: 9.5pt;">
        • <strong>MA10 지지 성공 (CLOSE >= MA10)</strong>: 주가가 10일선 위에서 안착하거나 10일선을 찍고 반등 중인 상태 (최적의 눌림목 타점)<br>
        • <strong>MA10 이탈 (CLOSE < MA10)</strong>: 단기 지지선 붕괴. 아무리 수급이 좋아도 10일선을 재탈환하기 전까지는 관망.
      </p>
    </div>

    <h2>3.3 기간별 수급강도(3일, 5일, 10일, 20일) 비교 전략</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">유형</th>
          <th style="width: 35%;">강도 패턴</th>
          <th>매매 전략 및 실전 시사점</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="font-bold text-red">단기 가속형</td>
          <td class="text-center font-bold">3일 > 5일 > 10일</td>
          <td>최근으로 올수록 매수 강도가 급증하는 형태. 즉시 슈팅이 나올 수 있는 <strong>돌파 매매 타점</strong>.</td>
        </tr>
        <tr>
          <td class="font-bold text-blue">중기 축적형</td>
          <td class="text-center font-bold">10일 > 3일 (양수 유지)</td>
          <td>10일간 꾸준히 매집한 뒤 잠시 숨고르기(눌림목) 중. 10일선 부근에서 <strong>분할 매수 타점</strong>.</td>
        </tr>
        <tr>
          <td class="font-bold text-slate-600">수급 이탈형</td>
          <td class="text-center font-bold">10일(+), 3일(-) 전환</td>
          <td>중기 매집 후 최근 3일간 외인/기관이 대량 매도로 돌아선 형태. <strong>매수 금지 / 비중 축소</strong>.</td>
        </tr>
      </tbody>
    </table>
    <div class="footer-note">VPE 수급 매매 실전 전략 가이드 | 3 / 4 Page</div>
  </div>

  <!-- ==================== PAGE 4 ==================== -->
  <div class="page">
    <h1>4. Part 5 & 3: 스마트머니와 최종 진입 타점</h1>

    <p>
      주도 업종(Part 8)과 10일 수급 강도(Part 7)를 통과한 종목 중, 마지막으로 
      <strong>외인의 중기 지분율 추세(Part 5)</strong>와 <strong>외인·기관 쌍끌이 연속 매집(Part 3)</strong>을 확인하여 최종 방아쇠(Trigger)를 당깁니다.
    </p>

    <h2>4.1 Part 5: 외인 지분율 추세 상승 + 3일 기관 동반 (Smart Money)</h2>
    <p>
      외국인은 주가를 6개월~1년 단위로 견인하는 거대 세력입니다. 
      외인 지분율이 최근 20거래일 동안 우상향한다는 것은 <strong>회사의 펀더멘털이나 모멘텀에 구조적 변화가 일어났음</strong>을 뜻합니다.
    </p>
    <ul>
      <li><strong>외인 지분율 20일 연속 상승</strong>: 주포의 물량 쥐기(포지션 축적 완료).</li>
      <li><strong>최근 3일 기관 동반 유입</strong>: 단기 모멘텀에 불을 붙이는 기폭제(Catalyst) 역할. 외인이 판을 깔아놓은 곳에 기관이 가세할 때 주가는 가장 가파르게 급등합니다.</li>
    </ul>

    <h2>4.2 Part 3: 3일 이상 연속 순매집 (Final Trigger)</h2>
    <p>
      기관이나 외인이 가격에 상관없이 3일, 4일, 5일 연속으로 장내 매수를 감행하는 것은 <strong>"지금 가격대에서도 무조건 사 모아야 할 긴급한 호재"</strong>가 존재함을 시사합니다.
    </p>
    <div class="callout callout-blue">
      <div class="callout-title">🎯 최고 승률의 '쌍끌이 연속 매집' 패턴</div>
      <p style="margin: 0; font-size: 9.5pt;">
        • <strong>외인 연속 매집 3일 이상 + 기관 연속 매집 3일 이상 동시 만족 종목</strong><br>
        • 당일 수급에서 외국인과 기관이 동시에 순매수(쌍끌이)를 기록하며 양봉을 형성할 때가 <strong>가장 완벽한 종가 베팅 / 익일 시초가 공략 타점</strong>입니다.
      </p>
    </div>

    <h2>4.3 매매 실행 및 리스크 관리 원칙</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 20%;">구분</th>
          <th>실전 실행 가이드라인</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="font-bold text-center">매수 타이밍</td>
          <td>
            <strong>1차 매수 (50%)</strong>: 장 마감 전 15:20~15:30 종가 베팅 (Part 8, 7, 5, 3 동시 만족 시)<br>
            <strong>2차 매수 (50%)</strong>: 익일 10일 이평선 지지 확인 또는 전일 고가 돌파 시 불타기/분할 매수
          </td>
        </tr>
        <tr>
          <td class="font-bold text-center">목표가 설정</td>
          <td>
            <strong>1차 목표 (비중 50% 익절)</strong>: 최근 20일 전고점 도달 또는 +5% ~ +7% 수익 달성 시<br>
            <strong>2차 목표 (잔여 비중 추세 홀딩)</strong>: 5일 이평선을 종가상 이탈할 때까지 수익 극대화
          </td>
        </tr>
        <tr>
          <td class="font-bold text-center">손절 기준</td>
          <td>
            <strong>기계적 손절</strong>: <strong>10일 이동평균선(MA10) 종가상 이탈 시</strong> 즉시 전량 손절 (-2% ~ -3% 내외)<br>
            <strong>수급 이탈 손절</strong>: 당일 외인·기관 합산 순매도가 최근 3일 누적치의 50%를 초과할 때
          </td>
        </tr>
      </tbody>
    </table>

    <h2>4.4 장마감 후 30분 데일리 실전 루틴</h2>
    <ol>
      <li><strong>15:40 [Part 8 점검]</strong>: 코스피 업종 강도 확인 → 1위~3위 주도 업종 및 대장주 3종목 메모</li>
      <li><strong>16:10 [Part 7 필터링]</strong>: 10일 수급강도 Top 20 확인 → 대장주 중 <strong>MA10 지지</strong> 종목 선별</li>
      <li><strong>16:25 [Part 5 & Part 3 교집합]</strong>: 외인 지분율 우상향 + 3일 이상 연속 쌍끌이 매집 일치 여부 확인</li>
      <li><strong>16:35 [최종 압축]</strong>: 익일 공략 대상 최우선 관심종목 <strong>1~2종목으로 최종 압축</strong> 후 매매 시나리오 수립</li>
    </ol>
    <div class="footer-note">VPE 수급 매매 실전 전략 가이드 | 4 / 4 Page</div>
  </div>

</body>
</html>
"""

def generate_pdf():
    workspace_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # Output paths
    html_path = os.path.join(workspace_dir, "topdown_supply_demand_guide.html")
    pdf_path = os.path.join(workspace_dir, "탑다운_수급매매_완성가이드.pdf")
    public_pdf_path = os.path.join(workspace_dir, "public", "탑다운_수급매매_완성가이드.pdf")
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(HTML_CONTENT)
    print(f"HTML written to {html_path}")
    
    # Chrome path
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(chrome_path):
        chrome_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        
    cmd = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        f"--print-to-pdf={pdf_path}",
        "--no-pdf-header-footer",
        html_path
    ]
    
    print(f"Running Chrome to generate PDF...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    
    if os.path.exists(pdf_path):
        size_kb = os.path.getsize(pdf_path) / 1024
        print(f"SUCCESS: Generated {pdf_path} ({size_kb:.1f} KB)")
        
        # Copy to public folder if public exists
        if os.path.exists(os.path.dirname(public_pdf_path)):
            import shutil
            shutil.copy2(pdf_path, public_pdf_path)
            print(f"Copied to {public_pdf_path}")
            
        # Copy to user uploaded / artifact dir if needed
        return True, pdf_path
    else:
        print(f"ERROR: PDF not generated. stderr: {res.stderr}")
        return False, None

if __name__ == "__main__":
    generate_pdf()

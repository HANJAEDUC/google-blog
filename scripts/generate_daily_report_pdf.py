# -*- coding: utf-8 -*-
"""
Daily Supply & Demand Report PDF Generator (일일 수급 데일리 리포트)
Generates date-specific daily PDF report for Top-Down Supply & Demand Analysis.
"""
import os
import sys
import json
import subprocess
from datetime import datetime

def format_date_korean(ymd_str):
    if not ymd_str or len(str(ymd_str)) != 8:
        return str(ymd_str)
    s = str(ymd_str)
    try:
        dt = datetime.strptime(s, "%Y%m%d")
        weekdays = ["월", "화", "수", "목", "금", "토", "일"]
        return f"{dt.year}년 {dt.month}월 {dt.day}일 ({weekdays[dt.weekday()]})"
    except Exception:
        return f"{s[:4]}.{s[4:6]}.{s[6:]}"

def build_daily_report_html(data):
    target_date = data.get("target_date", "")
    date_display = format_date_korean(target_date)
    krx_date = format_date_korean(data.get("krx_base_date", ""))
    updated_at = data.get("updated_at", "")
    
    all_evaluated = data.get("all_evaluated", [])
    part8_industries = data.get("part8_kospi_industries", [])
    p7_kospi = data.get("part7_kospi_top20", [])
    p7_kosdaq = data.get("part7_kosdaq_top20", [])
    algo1 = data.get("algo1_pullback", [])
    algo2 = data.get("algo2_stealth", [])
    algo3 = data.get("algo3_breakout", [])
    algo4 = data.get("algo4_smart_money", [])
    algo_ma = data.get("algo_ma_aligned", [])

    # Find Golden Picks (Intersection of Top S/A Grade + Multiple Algos or Part8/7 Leaders)
    golden_picks = []
    # Collect stocks with algo4 (Smart money) or algo2 (streak) that have S or A grade
    for s in all_evaluated:
        algos = s.get("포착알고리즘", "")
        grade = s.get("등급", "")
        is_above_ma10 = s.get("above_ma10", True)
        int10 = s.get("raw_supply_intensity_10d", 0) or 0
        
        # Candidate score
        score = 0
        if "S등급" in grade: score += 30
        elif "A등급" in grade: score += 20
        if is_above_ma10: score += 20
        if int10 >= 5: score += 25
        elif int10 >= 3: score += 15
        
        algo_count = 0
        if "눌림목" in algos: algo_count += 1
        if "연속매집" in algos: algo_count += 2
        if "외인지분" in algos: algo_count += 2
        if "정배열" in algos: algo_count += 1
        score += algo_count * 10
        
        if score >= 60 and (("연속매집" in algos) or ("외인지분" in algos) or ("S등급" in grade)):
            golden_picks.append((score, s))
            
    golden_picks.sort(key=lambda x: x[0], reverse=True)
    top_golden = [item[1] for item in golden_picks[:5]]

    # Part 8 Top 5
    top5_industries = part8_industries[:5]
    
    # Part 7 Top 10 for KOSPI and KOSDAQ
    top10_kospi = p7_kospi[:10]
    top10_kosdaq = p7_kosdaq[:10]

    # Helper formatters
    def fmt_rate(rate_val):
        try:
            val = float(str(rate_val).replace("%", "").replace("+", "").strip())
            color = "#dc2626" if val > 0 else "#2563eb" if val < 0 else "#475569"
            prefix = "+" if val > 0 else ""
            return f'<span style="color: {color}; font-weight: 700;">{prefix}{val:.2f}%</span>'
        except:
            return str(rate_val)

    def fmt_val(val_num):
        try:
            v = float(val_num)
            return f"{v:,.0f}억"
        except:
            return str(val_num)

    html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>[{target_date}] 일일 수급 데일리 리포트</title>
<style>
  @page {{
    size: A4;
    margin: 14mm 13mm;
  }}
  * {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
    color: #1e293b;
    line-height: 1.5;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
    background-color: #ffffff;
  }}
  .page {{
    page-break-after: always;
  }}
  .page:last-child {{
    page-break-after: avoid;
  }}
  
  /* Header */
  .report-header {{
    border-bottom: 2.5px solid #2563eb;
    padding-bottom: 10px;
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }}
  .title-area h1 {{
    font-size: 19pt;
    font-weight: 900;
    color: #0f172a;
    margin: 0 0 4px 0;
    letter-spacing: -0.5px;
  }}
  .title-area .sub {{
    font-size: 10pt;
    color: #64748b;
    margin: 0;
  }}
  .meta-area {{
    text-align: right;
    font-size: 8.5pt;
    color: #64748b;
  }}
  .meta-date-badge {{
    display: inline-block;
    background: #eff6ff;
    color: #1d4ed8;
    font-weight: 800;
    font-size: 10pt;
    padding: 3px 10px;
    border-radius: 6px;
    margin-bottom: 4px;
  }}

  /* Section Title */
  .section-title {{
    font-size: 11.5pt;
    font-weight: 800;
    color: #0f172a;
    border-left: 4px solid #2563eb;
    padding-left: 8px;
    margin: 14px 0 8px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}
  .section-tag {{
    font-size: 8.5pt;
    font-weight: 600;
    color: #64748b;
  }}

  /* Top Stats Strip */
  .stats-strip {{
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
  }}
  .stat-box {{
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 7px 10px;
    text-align: center;
  }}
  .stat-label {{
    font-size: 8pt;
    color: #64748b;
    display: block;
  }}
  .stat-value {{
    font-size: 12pt;
    font-weight: 800;
    color: #0f172a;
    margin-top: 2px;
  }}

  /* Tables */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 8.5pt;
  }}
  th {{
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    padding: 5px 6px;
    border: 1px solid #cbd5e1;
    text-align: center;
  }}
  td {{
    padding: 5px 6px;
    border: 1px solid #e2e8f0;
    color: #334155;
  }}
  tr:nth-child(even) td {{
    background-color: #fafbfc;
  }}
  .text-center {{ text-align: center; }}
  .text-right {{ text-align: right; }}
  .text-left {{ text-align: left; }}
  .font-bold {{ font-weight: 700; }}

  /* Badges */
  .badge {{
    display: inline-block;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
  }}
  .badge-kospi {{ background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }}
  .badge-kosdaq {{ background: #faf5ff; color: #6b21a8; border: 1px solid #e9d5ff; }}
  .badge-ma10-ok {{ background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }}
  .badge-ma10-no {{ background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }}
  .badge-s {{ background: #fef3c7; color: #92400e; font-weight: 800; }}
  .badge-a {{ background: #e0f2fe; color: #075985; }}

  /* Golden Pick Highlight Box */
  .golden-box {{
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border: 1.5px solid #10b981;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 14px;
  }}
  .golden-header {{
    font-size: 10pt;
    font-weight: 800;
    color: #064e3b;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
  }}

  .footer-bar {{
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
    font-size: 8pt;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
  }}
</style>
</head>
<body>

  <!-- ==================== PAGE 1 ==================== -->
  <div class="page">
    <div class="report-header">
      <div class="title-area">
        <span class="meta-date-badge">📅 {date_display}</span>
        <h1>일일 수급 매매 데일리 리포트</h1>
        <p class="sub">코스피 주도업종 선별 · 10일 수급강도(MA10) · 스마트머니 · 연속매집 종합 브리핑</p>
      </div>
      <div class="meta-area">
        <div><strong>분석 시스템</strong>: <a href="https://www.vpe.co.kr/private" style="color: #2563eb; text-decoration: none;">vpe.co.kr/private</a></div>
        <div>KRX 기준: {krx_date}</div>
        <div>생성시각: {updated_at}</div>
      </div>
    </div>

    <!-- Stats Strip -->
    <div class="stats-strip">
      <div class="stat-box">
        <span class="stat-label">유효 채점 종목</span>
        <div class="stat-value">{len(all_evaluated)}개</div>
      </div>
      <div class="stat-box">
        <span class="stat-label">🌟 S등급 / 🏆 A등급</span>
        <div class="stat-value" style="color: #d97706;">
          {len([x for x in all_evaluated if 'S등급' in x.get('등급', '')])} / {len([x for x in all_evaluated if 'A등급' in x.get('등급', '')])}개
        </div>
      </div>
      <div class="stat-box">
        <span class="stat-label">🏢 주도 업종 수</span>
        <div class="stat-value" style="color: #2563eb;">{len(part8_industries)}개</div>
      </div>
      <div class="stat-box">
        <span class="stat-label">🔥 10일 수급강도 Top</span>
        <div class="stat-value" style="color: #dc2626;">40종목</div>
      </div>
      <div class="stat-box">
        <span class="stat-label">📈 외인지분↑ / 🕵️ 연속매집</span>
        <div class="stat-value">{len(algo4)} / {len(algo2)}개</div>
      </div>
    </div>

    <!-- Golden Pick Banner -->
    <div class="golden-box">
      <div class="golden-header">
        <span>🎯 [골든 픽] 당일 탑다운 최우선 관심종목 (다중 수급 조건 일치)</span>
        <span style="font-size: 8.5pt; font-weight: 600; color: #047857;">주도섹터 · 수급밀도 · 외인지분 · 쌍끌이 교집합</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>종목명 (코드)</th>
            <th>시장</th>
            <th>종가</th>
            <th>등락률</th>
            <th>10일합산강도</th>
            <th>10일선(MA10)</th>
            <th>포착 알고리즘</th>
            <th>거래대금</th>
            <th>등급</th>
          </tr>
        </thead>
        <tbody>
"""

    for s in top_golden:
        code = s.get("종목코드", "")
        name = s.get("종목명", "")
        mkt = s.get("시장", "")
        price = s.get("종가(원)", "")
        rate_str = fmt_rate(s.get("등락률(%)", ""))
        int10 = s.get("10일합산강도(%)", "-")
        above10 = s.get("above_ma10", True)
        ma_badge = '<span class="badge badge-ma10-ok">MA10 지지</span>' if above10 else '<span class="badge badge-ma10-no">MA10 이탈</span>'
        algos = s.get("포착알고리즘", "-")
        val_str = fmt_val(s.get("거래대금(억)", s.get("raw_val_eok", 0)))
        grade = s.get("등급", "")
        g_badge = '<span class="badge badge-s">S등급</span>' if 'S등급' in grade else '<span class="badge badge-a">A등급</span>' if 'A등급' in grade else '<span class="badge">B등급</span>'
        m_badge = f'<span class="badge badge-{mkt.lower()}">{mkt}</span>'

        html += f"""
          <tr>
            <td class="font-bold">{name} <span style="font-size: 7.5pt; color: #64748b;">({code})</span></td>
            <td class="text-center">{m_badge}</td>
            <td class="text-right">{price}</td>
            <td class="text-center">{rate_str}</td>
            <td class="text-center font-bold" style="color: #ea580c;">{int10}</td>
            <td class="text-center">{ma_badge}</td>
            <td><span style="font-size: 8pt; color: #0f172a;">{algos}</span></td>
            <td class="text-right">{val_str}</td>
            <td class="text-center">{g_badge}</td>
          </tr>
        """

    html += f"""
        </tbody>
      </table>
    </div>

    <!-- Section 1: Part 8 코스피 주도 업종 TOP 5 -->
    <div class="section-title">
      <span>🏢 1. 코스피 장마감 주도 업종 TOP 5 및 핵심 대장주</span>
      <span class="section-tag">기준: 등락률 + 상승비율(60%↑) + 거래대금 증가율</span>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 7%;">순위</th>
          <th style="width: 18%;">업종명</th>
          <th style="width: 11%;">등락률</th>
          <th style="width: 15%;">상승 종목 비율</th>
          <th style="width: 14%;">20일대비 거래대금</th>
          <th style="width: 35%;">1위 대장주 (등락률 / 거래대금)</th>
        </tr>
      </thead>
      <tbody>
    """

    medals = ["🥇 1위", "🥈 2위", "🥉 3위", "4위", "5위"]
    for i, ind in enumerate(top5_industries):
        rank_str = medals[i] if i < len(medals) else f"{i+1}위"
        name = ind.get("name", "")
        rate_str = fmt_rate(ind.get("fluctuation_rate", 0))
        rise_ratio = ind.get("rise_ratio", 0)
        rise_count = ind.get("rise_count", 0)
        valid_count = ind.get("valid_count", 0)
        t_inc = ind.get("trade_val_increase_rate", 0)
        t_inc_color = "#dc2626" if t_inc > 0 else "#2563eb"
        t_inc_str = f'<span style="color: {t_inc_color}; font-weight: 700;">{"+" if t_inc > 0 else ""}{t_inc:.1f}%</span>'
        
        leaders = ind.get("leaders", [])
        l1_str = "-"
        if leaders:
            l1 = leaders[0]
            l1_rate = fmt_rate(l1.get("rate", 0))
            l1_val = fmt_val(l1.get("val_eok", 0))
            l1_str = f"<strong>{l1.get('name')}</strong> ({l1_rate} / {l1_val})"

        html += f"""
        <tr>
          <td class="text-center font-bold">{rank_str}</td>
          <td class="font-bold">{name}</td>
          <td class="text-center">{rate_str}</td>
          <td class="text-center">{rise_ratio:.1f}% ({rise_count}/{valid_count}개)</td>
          <td class="text-center">{t_inc_str}</td>
          <td>{l1_str}</td>
        </tr>
        """

    html += f"""
      </tbody>
    </table>

    <div class="footer-bar">
      <span>VPE 수급 매매 일일 브리핑 리포트</span>
      <span>1 / 3 Page (주도업종 & 골든픽)</span>
    </div>
  </div>

  <!-- ==================== PAGE 2 ==================== -->
  <div class="page">
    <div class="section-title" style="margin-top: 0;">
      <span>🔥 2. 코스피 10일 수급강도 TOP 10 (외인+기관 누적 순매수 ÷ 거래량)</span>
      <span class="section-tag">10일선(MA10) 지지 여부 및 기간별 수급가속도 점검</span>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 6%;">순위</th>
          <th style="width: 18%;">종목명 (코드)</th>
          <th style="width: 10%;">종가</th>
          <th style="width: 9%;">등락률</th>
          <th style="width: 12%;">10일선(MA10)</th>
          <th style="width: 11%;">10일 합산강도</th>
          <th style="width: 13%;">외인 / 기관강도</th>
          <th style="width: 13%;">기간별(3/5/10d)</th>
          <th style="width: 8%;">등급</th>
        </tr>
      </thead>
      <tbody>
    """

    for i, s in enumerate(top10_kospi):
        name = s.get("종목명", "")
        code = s.get("종목코드", "")
        price = s.get("종가(원)", "")
        rate_str = fmt_rate(s.get("등락률(%)", ""))
        above10 = s.get("above_ma10", True)
        ma_badge = '<span class="badge badge-ma10-ok">지지</span>' if above10 else '<span class="badge badge-ma10-no">이탈</span>'
        int10 = s.get("10일합산강도(%)", "-")
        f_int = s.get("10일외인강도(%)", "-")
        o_int = s.get("10일기관강도(%)", "-")
        int3 = s.get("3일합산강도(%)", "-")
        int5 = s.get("5일합산강도(%)", "-")
        grade = s.get("등급", "")
        g_badge = '<span class="badge badge-s">S등급</span>' if 'S등급' in grade else '<span class="badge badge-a">A등급</span>' if 'A등급' in grade else '<span class="badge">B등급</span>'

        html += f"""
        <tr>
          <td class="text-center font-bold">#{i+1}</td>
          <td class="font-bold">{name} <span style="font-size: 7.5pt; color: #64748b;">({code})</span></td>
          <td class="text-right">{price}</td>
          <td class="text-center">{rate_str}</td>
          <td class="text-center">{ma_badge} <span style="font-size: 7.5pt; color: #64748b;">{s.get('MA10', '')}</span></td>
          <td class="text-center font-bold" style="color: #ea580c;">{int10}</td>
          <td class="text-center" style="font-size: 8pt;">{f_int} / {o_int}</td>
          <td class="text-center" style="font-size: 7.5pt; color: #475569;">{int3} | {int5}</td>
          <td class="text-center">{g_badge}</td>
        </tr>
        """

    html += f"""
      </tbody>
    </table>

    <div class="section-title" style="margin-top: 14px;">
      <span>🔥 3. 코스닥 10일 수급강도 TOP 10</span>
      <span class="section-tag">코스닥 유망 개별주 및 테마 대장주 수급 밀도</span>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 6%;">순위</th>
          <th style="width: 18%;">종목명 (코드)</th>
          <th style="width: 10%;">종가</th>
          <th style="width: 9%;">등락률</th>
          <th style="width: 12%;">10일선(MA10)</th>
          <th style="width: 11%;">10일 합산강도</th>
          <th style="width: 13%;">외인 / 기관강도</th>
          <th style="width: 13%;">기간별(3/5/10d)</th>
          <th style="width: 8%;">등급</th>
        </tr>
      </thead>
      <tbody>
    """

    for i, s in enumerate(top10_kosdaq):
        name = s.get("종목명", "")
        code = s.get("종목코드", "")
        price = s.get("종가(원)", "")
        rate_str = fmt_rate(s.get("등락률(%)", ""))
        above10 = s.get("above_ma10", True)
        ma_badge = '<span class="badge badge-ma10-ok">지지</span>' if above10 else '<span class="badge badge-ma10-no">이탈</span>'
        int10 = s.get("10일합산강도(%)", "-")
        f_int = s.get("10일외인강도(%)", "-")
        o_int = s.get("10일기관강도(%)", "-")
        int3 = s.get("3일합산강도(%)", "-")
        int5 = s.get("5일합산강도(%)", "-")
        grade = s.get("등급", "")
        g_badge = '<span class="badge badge-s">S등급</span>' if 'S등급' in grade else '<span class="badge badge-a">A등급</span>' if 'A등급' in grade else '<span class="badge">B등급</span>'

        html += f"""
        <tr>
          <td class="text-center font-bold">#{i+1}</td>
          <td class="font-bold">{name} <span style="font-size: 7.5pt; color: #64748b;">({code})</span></td>
          <td class="text-right">{price}</td>
          <td class="text-center">{rate_str}</td>
          <td class="text-center">{ma_badge} <span style="font-size: 7.5pt; color: #64748b;">{s.get('MA10', '')}</span></td>
          <td class="text-center font-bold" style="color: #ea580c;">{int10}</td>
          <td class="text-center" style="font-size: 8pt;">{f_int} / {o_int}</td>
          <td class="text-center" style="font-size: 7.5pt; color: #475569;">{int3} | {int5}</td>
          <td class="text-center">{g_badge}</td>
        </tr>
        """

    html += f"""
      </tbody>
    </table>

    <div class="footer-bar">
      <span>VPE 수급 매매 일일 브리핑 리포트</span>
      <span>2 / 3 Page (10일 수급강도 순위)</span>
    </div>
  </div>

  <!-- ==================== PAGE 3 ==================== -->
  <div class="page">
    <div class="section-title" style="margin-top: 0;">
      <span>📈 4. Part 5: 외인 지분율 상승 + 3일 기관 동반 유입 (Smart Money)</span>
      <span class="section-tag">20일 외인지분 우상향 속 기관의 신규 가세</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>종목명 (코드)</th>
          <th>시장</th>
          <th>종가</th>
          <th>등락률</th>
          <th>외인지분율(변화)</th>
          <th>최근 3일 기관순매수</th>
          <th>10일합산강도</th>
          <th>거래대금</th>
          <th>등급</th>
        </tr>
      </thead>
      <tbody>
    """

    for s in algo4[:6]:
        name = s.get("종목명", "")
        code = s.get("종목코드", "")
        mkt = s.get("시장", "")
        price = s.get("종가(원)", "")
        rate_str = fmt_rate(s.get("등락률(%)", ""))
        int10 = s.get("10일합산강도(%)", "-")
        note = s.get("algo4_note", "-")
        val_str = fmt_val(s.get("거래대금(억)", s.get("raw_val_eok", 0)))
        grade = s.get("등급", "")
        g_badge = '<span class="badge badge-s">S등급</span>' if 'S등급' in grade else '<span class="badge badge-a">A등급</span>' if 'A등급' in grade else '<span class="badge">B등급</span>'
        m_badge = f'<span class="badge badge-{mkt.lower()}">{mkt}</span>'

        html += f"""
        <tr>
          <td class="font-bold">{name} <span style="font-size: 7.5pt; color: #64748b;">({code})</span></td>
          <td class="text-center">{m_badge}</td>
          <td class="text-right">{price}</td>
          <td class="text-center">{rate_str}</td>
          <td class="text-center" style="font-size: 8pt; color: #2563eb;">20일 지분율↑</td>
          <td class="text-center" style="font-size: 8pt; color: #dc2626;">3일 연속 순매수</td>
          <td class="text-center font-bold">{int10}</td>
          <td class="text-right">{val_str}</td>
          <td class="text-center">{g_badge}</td>
        </tr>
        """

    if not algo4:
        html += '<tr><td colspan="9" class="text-center" style="padding: 12px; color: #94a3b8;">당일 해당 알고리즘 포착 종목이 없습니다.</td></tr>'

    html += f"""
      </tbody>
    </table>

    <div class="section-title" style="margin-top: 14px;">
      <span>🕵️ 5. Part 3: 3일 이상 연속 순매집 및 쌍끌이 종목 (Final Trigger)</span>
      <span class="section-tag">외인·기관 동반 3일~5일 연속 매집으로 즉시 공략 가능한 타점</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>종목명 (코드)</th>
          <th>시장</th>
          <th>종가</th>
          <th>등락률</th>
          <th>연속 매집 일수</th>
          <th>10일선(MA10) 지지</th>
          <th>10일합산강도</th>
          <th>거래대금</th>
          <th>등급</th>
        </tr>
      </thead>
      <tbody>
    """

    for s in algo2[:6]:
        name = s.get("종목명", "")
        code = s.get("종목코드", "")
        mkt = s.get("시장", "")
        price = s.get("종가(원)", "")
        rate_str = fmt_rate(s.get("등락률(%)", ""))
        int10 = s.get("10일합산강도(%)", "-")
        streak = s.get("연속순매수", "3일 이상")
        above10 = s.get("above_ma10", True)
        ma_badge = '<span class="badge badge-ma10-ok">MA10 지지</span>' if above10 else '<span class="badge badge-ma10-no">MA10 이탈</span>'
        val_str = fmt_val(s.get("거래대금(억)", s.get("raw_val_eok", 0)))
        grade = s.get("등급", "")
        g_badge = '<span class="badge badge-s">S등급</span>' if 'S등급' in grade else '<span class="badge badge-a">A등급</span>' if 'A등급' in grade else '<span class="badge">B등급</span>'
        m_badge = f'<span class="badge badge-{mkt.lower()}">{mkt}</span>'

        html += f"""
        <tr>
          <td class="font-bold">{name} <span style="font-size: 7.5pt; color: #64748b;">({code})</span></td>
          <td class="text-center">{m_badge}</td>
          <td class="text-right">{price}</td>
          <td class="text-center">{rate_str}</td>
          <td class="text-center font-bold" style="color: #2563eb;">{streak}</td>
          <td class="text-center">{ma_badge}</td>
          <td class="text-center font-bold">{int10}</td>
          <td class="text-right">{val_str}</td>
          <td class="text-center">{g_badge}</td>
        </tr>
        """

    if not algo2:
        html += '<tr><td colspan="9" class="text-center" style="padding: 12px; color: #94a3b8;">당일 해당 알고리즘 포착 종목이 없습니다.</td></tr>'

    html += f"""
      </tbody>
    </table>

    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-top: 14px; font-size: 8.5pt;">
      <strong>🎯 내일 장 공략 핵심 요약 및 매매 행동 수칙:</strong><br>
      • <strong>주도 업종 대장주 우선</strong>: 오늘 거래대금이 실리며 상승 종목 비율 60%를 넘긴 주도 섹터의 1위 대장주를 최우선 순위로 둡니다.<br>
      • <strong>10일선(MA10) 지지 필수</strong>: 10일 수급강도가 높아도 현재가가 10일선 아래에 위치한 종목은 지지 안착 전까지 관망합니다.<br>
      • <strong>손절 원칙 준수</strong>: 종가 기준으로 10일 이동평균선을 하향 이탈할 경우 기계적 손절을 집행합니다.
    </div>

    <div class="footer-bar">
      <span>VPE 수급 매매 일일 브리핑 리포트</span>
      <span>3 / 3 Page (스마트머니 & 최종 타점)</span>
    </div>
  </div>

</body>
</html>
"""
    return html

def generate_daily_report_for_date(target_date=None):
    # Detect workspace
    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_dir = os.path.dirname(script_dir)
    public_dir = os.path.join(workspace_dir, "public")
    daily_reports_dir = os.path.join(public_dir, "daily_reports")
    os.makedirs(daily_reports_dir, exist_ok=True)
    
    data_dir = os.path.join(public_dir, "data")
    
    # If no target_date, find from midterm_gems_latest.json
    latest_json_path = os.path.join(data_dir, "midterm_gems_latest.json")
    if not target_date:
        if os.path.exists(latest_json_path):
            with open(latest_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            target_date = data.get("target_date")
        else:
            print("No latest json found.")
            return False, None
    else:
        # Load specific target_date
        specific_json = os.path.join(data_dir, f"midterm_gems_ALL_{target_date}.json")
        if os.path.exists(specific_json):
            with open(specific_json, "r", encoding="utf-8") as f:
                data = json.load(f)
        elif os.path.exists(latest_json_path):
            with open(latest_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            print(f"Data not found for {target_date}")
            return False, None

    html_content = build_daily_report_html(data)
    
    # Paths for HTML and PDF
    temp_html_path = os.path.join(daily_reports_dir, f"daily_report_{target_date}.html")
    pdf_filename = f"daily_report_{target_date}.pdf"
    pdf_output_path = os.path.join(daily_reports_dir, pdf_filename)
    
    latest_pdf_in_reports = os.path.join(daily_reports_dir, "daily_report_latest.pdf")
    latest_pdf_in_public = os.path.join(public_dir, "daily_report_latest.pdf")
    
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(chrome_path):
        chrome_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

    cmd = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        f"--print-to-pdf={pdf_output_path}",
        "--no-pdf-header-footer",
        temp_html_path
    ]
    
    print(f"Generating Daily Report PDF for {target_date}...")
    subprocess.run(cmd, check=True)
    
    if os.path.exists(pdf_output_path):
        size_kb = os.path.getsize(pdf_output_path) / 1024
        print(f"SUCCESS: Generated {pdf_output_path} ({size_kb:.1f} KB)")
        
        # Copy to latest
        import shutil
        shutil.copy2(pdf_output_path, latest_pdf_in_reports)
        shutil.copy2(pdf_output_path, latest_pdf_in_public)
        
        # Also copy to workspace root
        root_pdf = os.path.join(workspace_dir, f"수급데일리리포트_{target_date}.pdf")
        shutil.copy2(pdf_output_path, root_pdf)
        
        # Clean up temp html
        if os.path.exists(temp_html_path):
            os.remove(temp_html_path)
            
        return True, pdf_output_path
    else:
        print(f"Failed to create PDF at {pdf_output_path}")
        return False, None

if __name__ == "__main__":
    t_date = sys.argv[1] if len(sys.argv) > 1 else None
    generate_daily_report_for_date(t_date)

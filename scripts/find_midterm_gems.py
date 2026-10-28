import os
import re
import sys
import json
import datetime
import requests
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed

# Windows 콘솔 한글 깨짐 방지
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

# ==============================================================================
# 💎 [통합 엔진] 백데이터(60일) + 거래량 + 네이버 수급(20일) 결합
#    「중단기 투자 종목 선정 5대 핵심 알고리즘 (1~5 통합)」 (find_midterm_gems.py)
# ==============================================================================
# - Part 1 [알고리즘 5]: 🌟 100점 만점 멀티팩터 종합 랭킹 Top 30 (S/A/B 등급)
# - Part 2 [알고리즘 1]: 🎯 대량거래 기준봉 후 '거래량 급감 눌림목 + 수급 홀딩' 종목
# - Part 3 [알고리즘 2]: 🕵️ 변동성 수축(VCP) + 외인/기관 '조용한 연속 매집' 종목
# - Part 4 [알고리즘 3]: 🚀 과열 배제형(적정 회전율) '초입 진성 거래량 돌파' 종목
# - Part 5 [알고리즘 4]: 📈 외인 지분율 추세 상승 + 기관 동반 유입 (Smart Money) 종목
# ==============================================================================

AUTH_KEY = "97DAD0250A6344FCA1D50159AB9C5D3424D0AFBE"
URL_KOSPI = "https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd"
URL_KOSDAQ = "https://data-dbg.krx.co.kr/svc/apis/sto/ksq_bydd_trd"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, "krx_cache")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

HEADERS_NAVER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def parse_int(val, default=0):
    if val is None:
        return default
    try:
        s = str(val).replace(",", "").replace("+", "").strip()
        if not s or s == "-":
            return default
        return int(float(s))
    except Exception:
        return default


def parse_float(val, default=0.0):
    if val is None:
        return default
    try:
        s = str(val).replace(",", "").replace("+", "").replace("%", "").strip()
        if not s or s == "-":
            return default
        return float(s)
    except Exception:
        return default


def is_common_stock(name):
    """우선주, 스팩(SPAC), 리츠, ETN 등을 배제하고 일반 보통주만 선별"""
    if not name:
        return False
    exclude_keywords = ["스팩", "리츠", "ETN", "ETF", "인버스", "레버리지", "선물", "채권"]
    for kw in exclude_keywords:
        if kw in name:
            return False
    if name.endswith(("우", "우B", "우C", "1우", "2우B", "3우B")):
        return False
    return True


def fetch_krx_day(market, date_str):
    """특정 시장(kospi/kosdaq)의 일별 시세를 캐시 또는 KRX API에서 로드"""
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_path = os.path.join(CACHE_DIR, f"{market.lower()}_{date_str}.json")
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 1000:
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data:
                    return data
        except Exception:
            pass

    url = URL_KOSPI if market.lower() == "kospi" else URL_KOSDAQ
    try:
        r = requests.get(url, headers={"AUTH_KEY": AUTH_KEY}, params={"basDd": date_str}, timeout=8)
        if r.status_code == 200:
            data = r.json().get("OutBlock_1", [])
            if data:
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False)
                return data
    except Exception:
        pass
    return []


def get_cached_trading_days(target_date, count=60):
    """로컬 캐시 우선 활용 + 필요시 KRX API로 과거 영업일 목록 확보"""
    os.makedirs(CACHE_DIR, exist_ok=True)
    cached_dates = sorted([
        f.replace("kospi_", "").replace(".json", "")
        for f in os.listdir(CACHE_DIR)
        if f.startswith("kospi_") and f.endswith(".json") and os.path.getsize(os.path.join(CACHE_DIR, f)) > 1000
    ])
    valid_dates = [d for d in cached_dates if d <= target_date]

    # 만약 target_date가 캐시에 없으면 KRX API에 반영되었는지 1회 확인
    if target_date not in valid_dates:
        data = fetch_krx_day("kospi", target_date)
        if data:
            valid_dates.append(target_date)
            valid_dates.sort()

    if len(valid_dates) >= count:
        return valid_dates[-count:]

    # 캐시가 부족할 경우 역순 탐색
    cur = datetime.datetime.strptime(target_date, "%Y%m%d")
    while len(valid_dates) < count and cur > datetime.datetime(2026, 4, 1):
        d_str = cur.strftime("%Y%m%d")
        if cur.weekday() < 5 and d_str not in valid_dates:
            data = fetch_krx_day("kospi", d_str)
            if data:
                valid_dates.append(d_str)
        cur -= datetime.timedelta(days=1)

    valid_dates.sort()
    return valid_dates[-count:]


def get_naver_latest_bizdate():
    """네이버 증권에서 가장 최근 영업일(YYYYMMDD) 확인"""
    try:
        r = requests.get("https://m.stock.naver.com/api/stock/005930/trend", headers=HEADERS_NAVER, timeout=4)
        if r.status_code == 200:
            data = r.json()
            if data and data[0].get("bizdate"):
                return data[0]["bizdate"]
    except Exception:
        pass
    return "20261028"


def validate_target_date(target_date):
    """
    사용자가 입력한 날짜가:
    1) 올바른 달력 날짜(YYYYMMDD)인지
    2) 아직 도래하지 않은 미래 날짜인지
    3) 주말/공휴일(휴장일)이거나 데이터를 판별할 수 없는 날짜인지 검증하고 경고 출력
    """
    # 1. 날짜 포맷 및 달력 유효성 검증
    if not target_date or len(target_date) != 8 or not target_date.isdigit():
        print("\n" + "=" * 95)
        print(f"⚠️ [날짜 입력 오류] '{target_date}' 형식이 올바르지 않습니다. 8자리 숫자(YYYYMMDD)로 입력해 주세요.")
        print("   ▶ 올바른 입력 예시: python find_midterm_gems.py 20261028")
        print("=" * 95 + "\n")
        return False

    try:
        dt = datetime.datetime.strptime(target_date, "%Y%m%d")
    except ValueError:
        print("\n" + "=" * 95)
        print(f"⚠️ [날짜 입력 오류] '{target_date}'는 달력에 존재하지 않는 날짜입니다. 날짜를 다시 확인해 주세요.")
        print("=" * 95 + "\n")
        return False

    # 2. 최신 거래일 확인 및 미래 날짜 검증
    latest_bizdate = get_naver_latest_bizdate()
    if target_date > latest_bizdate:
        print("\n" + "=" * 95)
        print(f"⚠️ [미래 날짜 경고] 입력하신 [{target_date}]은 아직 거래 데이터가 없는 미래 날짜입니다!")
        print(f"   ▶ 현재 분석 가능한 가장 최신 거래일: [{latest_bizdate}]")
        print(f"   ▶ 올바른 실행 예시: python find_midterm_gems.py {latest_bizdate}")
        print("=" * 95 + "\n")
        return False

    # 3. 주말(토/일) 여부 1차 확인
    weekday_names = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
    w_idx = dt.weekday()

    # 네이버 증권 대표 종목(삼성전자 005930) 기준 실제 개장일 데이터 존재 여부 확인
    is_valid_trading_day = False
    nearest_prev_day = None
    try:
        r = requests.get(
            f"https://m.stock.naver.com/api/stock/005930/trend?pageSize=20&bizdate={target_date}",
            headers=HEADERS_NAVER,
            timeout=4
        )
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list) and len(data) > 0:
                bizdates = [d.get("bizdate", "") for d in data if d.get("bizdate", "") <= target_date]
                if target_date in bizdates:
                    is_valid_trading_day = True
                elif bizdates:
                    nearest_prev_day = max(bizdates)
    except Exception:
        pass

    # 네이버 응답에 없을 경우 로컬 캐시/KRX API로 2차 확인
    if not is_valid_trading_day and w_idx < 5:
        krx_data = fetch_krx_day("kospi", target_date)
        if krx_data:
            is_valid_trading_day = True

    if not is_valid_trading_day:
        reason = f"주말({weekday_names[w_idx]})" if w_idx >= 5 else "공휴일(휴장일) 또는 거래 데이터 미존재일"
        print("\n" + "=" * 95)
        print(f"⚠️ [휴장일/데이터 없음 경고] 입력하신 [{target_date} ({weekday_names[w_idx]})]은 {reason}이므로 데이터를 판별할 수 없습니다!")
        if nearest_prev_day:
            print(f"   ▶ 입력하신 날짜 직전의 가장 가까운 정상 거래일: [{nearest_prev_day}]")
            print(f"   ▶ 올바른 실행 예시: python find_midterm_gems.py {nearest_prev_day}")
        else:
            print(f"   ▶ 최신 거래일 실행 예시: python find_midterm_gems.py {latest_bizdate}")
        print("=" * 95 + "\n")
        return False

    return True


def fetch_naver_stock_bundle(code, target_date=None):
    """
    네이버 증권 API에서:
    1) 최근일별 외국인/기관 수급(/trend?pageSize=60) 및
    2) 최근 90영업일 일봉 시세(fchart OHLCV)를 동시에 고속 조회
    """
    trends = []
    chart_bars = []
    try:
        trend_url = f"https://m.stock.naver.com/api/stock/{code}/trend?pageSize=60"
        if target_date:
            trend_url += f"&bizdate={target_date}"
        r1 = requests.get(trend_url, headers=HEADERS_NAVER, timeout=4)
        if r1.status_code == 200:
            data = r1.json()
            if isinstance(data, list):
                trends = data
    except Exception:
        pass

    try:
        r2 = requests.get(
            f"https://fchart.stock.naver.com/sise.nhn?symbol={code}&timeframe=day&count=90&requestType=0",
            headers=HEADERS_NAVER,
            timeout=4
        )
        if r2.status_code == 200:
            items = re.findall(r'data="([^"]+)"', r2.text)
            prev_c = 0
            for item in items:
                parts = item.split("|")
                if len(parts) >= 6:
                    dt, o_p, h_p, l_p, c_p, vol = parts[0], parse_int(parts[1]), parse_int(parts[2]), parse_int(parts[3]), parse_int(parts[4]), parse_int(parts[5])
                    rate = ((c_p - prev_c) / prev_c * 100.0) if prev_c > 0 else 0.0
                    prev_c = c_p
                    chart_bars.append({
                        "date": dt,
                        "open": o_p,
                        "high": h_p,
                        "low": l_p,
                        "close": c_p,
                        "vol": vol,
                        "val": c_p * vol,
                        "rate": round(rate, 2)
                    })
    except Exception:
        pass

    return trends, chart_bars


def build_universe_and_series(target_date, min_val_eok=10.0):
    """
    1. KRX 60영업일 백데이터(KOSPI) + 최근 KOSDAQ 시세를 로드
    2. KRX 미반영 최신 거래일은 네이버 시세/수급 데이터로 하이브리드 보정
    """
    trading_days = get_cached_trading_days(target_date, count=62)
    latest_krx_day = trading_days[-1] if trading_days else target_date

    print(f"▶ [Step 1] KRX 백데이터 로드 중: 총 {len(trading_days)}영업일 ({trading_days[0]} ~ {latest_krx_day})")
    if latest_krx_day < target_date:
        print(f"   ℹ️ KRX Open API에 [{target_date}] 정산 데이터가 아직 미반영 상태입니다.")
        print(f"   ⚡ [하이브리드 보정 가동] 60일 기준선은 KRX 백데이터({latest_krx_day}까지)를 사용하고,")
        print(f"      최신 영업일([{target_date}])의 종가·거래량·외인/기관 수급은 네이버 API에서 실시간 결합합니다!")

    stock_series = {}

    # 1) KOSPI 60영업일 시계열 로드 (캐시에서 1초 내 고속 로드)
    for d_str in trading_days:
        kp_items = fetch_krx_day("kospi", d_str)
        for it in kp_items:
            code = it.get("ISU_CD", it.get("ISU_SRT_CD", ""))
            name = it.get("ISU_NM", "")
            if not is_common_stock(name):
                continue
            close_p = parse_int(it.get("TDD_CLSPRC", 0))
            open_p = parse_int(it.get("TDD_OPNPRC", 0))
            high_p = parse_int(it.get("TDD_HGPRC", 0))
            low_p = parse_int(it.get("TDD_LWPRC", 0))
            vol = parse_int(it.get("ACC_TRDVOL", 0))
            val = parse_int(it.get("ACC_TRDVAL", 0))
            fluc = parse_float(it.get("FLUC_RT", 0.0))
            shrs = parse_int(it.get("LIST_SHRS", 0))
            mktcap = parse_int(it.get("MKTCAP", 0))

            if code not in stock_series:
                stock_series[code] = {
                    "market": "KOSPI",
                    "name": name,
                    "shrs": shrs,
                    "mktcap": mktcap,
                    "records": []
                }
            else:
                if shrs > 0:
                    stock_series[code]["shrs"] = shrs
                if mktcap > 0:
                    stock_series[code]["mktcap"] = mktcap

            stock_series[code]["records"].append({
                "date": d_str,
                "close": close_p,
                "open": open_p,
                "high": high_p,
                "low": low_p,
                "vol": vol,
                "val": val,
                "rate": fluc
            })

    # 2) KOSDAQ 캐시된 일자 로드 + 최신일 시세 반영
    kq_cached_dates = sorted([
        f.replace("kosdaq_", "").replace(".json", "")
        for f in os.listdir(CACHE_DIR)
        if f.startswith("kosdaq_") and f.endswith(".json") and os.path.getsize(os.path.join(CACHE_DIR, f)) > 1000
    ])
    kq_dates = [d for d in kq_cached_dates if d <= target_date]
    if latest_krx_day and latest_krx_day not in kq_dates:
        if fetch_krx_day("kosdaq", latest_krx_day):
            kq_dates.append(latest_krx_day)
            kq_dates.sort()

    for d_str in kq_dates:
        kq_items = fetch_krx_day("kosdaq", d_str)
        for it in kq_items:
            code = it.get("ISU_CD", it.get("ISU_SRT_CD", ""))
            name = it.get("ISU_NM", "")
            if not is_common_stock(name):
                continue
            close_p = parse_int(it.get("TDD_CLSPRC", 0))
            open_p = parse_int(it.get("TDD_OPNPRC", 0))
            high_p = parse_int(it.get("TDD_HGPRC", 0))
            low_p = parse_int(it.get("TDD_LWPRC", 0))
            vol = parse_int(it.get("ACC_TRDVOL", 0))
            val = parse_int(it.get("ACC_TRDVAL", 0))
            fluc = parse_float(it.get("FLUC_RT", 0.0))
            shrs = parse_int(it.get("LIST_SHRS", 0))
            mktcap = parse_int(it.get("MKTCAP", 0))

            if code not in stock_series:
                stock_series[code] = {
                    "market": "KOSDAQ",
                    "name": name,
                    "shrs": shrs,
                    "mktcap": mktcap,
                    "records": []
                }
            else:
                if shrs > 0:
                    stock_series[code]["shrs"] = shrs
                if mktcap > 0:
                    stock_series[code]["mktcap"] = mktcap

            stock_series[code]["records"].append({
                "date": d_str,
                "close": close_p,
                "open": open_p,
                "high": high_p,
                "low": low_p,
                "vol": vol,
                "val": val,
                "rate": fluc
            })

    # 3) 1차 유동성 및 활성 종목 유니버스 추출 (KOSPI + KOSDAQ)
    # 거래대금이 활발하거나 거래량이 증가한 상위 후보군 약 220개를 선별하여 네이버 20일 수급 병렬 조회
    min_val_won = min_val_eok * 100_000_000
    kospi_candidates = []
    kosdaq_candidates = []

    for code, info in stock_series.items():
        recs = info["records"]
        if not recs:
            continue
        last_rec = recs[-1]
        if last_rec["close"] < 1000:
            continue

        # 최근 5일 최대 거래대금 또는 당일 거래대금이 기준 이상인 종목
        recent_max_val = max(r["val"] for r in recs[-5:])
        if recent_max_val < min_val_won:
            continue

        # 정렬 우선순위 점수: 당일 거래대금 + 최근 거래량 활성도
        vol_avg = sum(r["vol"] for r in recs[-20:]) / max(1, len(recs[-20:]))
        vol_ratio = last_rec["vol"] / vol_avg if vol_avg > 0 else 1.0
        priority_score = (last_rec["val"] / 100_000_000) * (1.0 + min(5.0, vol_ratio * 0.5))

        if info["market"] == "KOSPI":
            if len(recs) >= 20:
                kospi_candidates.append((priority_score, code))
        else:
            kosdaq_candidates.append((priority_score, code))

    kospi_candidates.sort(reverse=True)
    kosdaq_candidates.sort(reverse=True)

    # 코스피 상위 150개 + 코스닥 상위 100개 = 총 250개 핵심 후보군 선정
    selected_codes = [c for _, c in kospi_candidates[:150]] + [c for _, c in kosdaq_candidates[:100]]
    return stock_series, selected_codes, latest_krx_day


def analyze_single_stock(code, info, trend_list, chart_bars, target_date):
    """
    단일 종목에 대해 KRX 백데이터 + 네이버 65일 일봉 + 네이버 수급 데이터를 결합하고
    알고리즘 1 ~ 5를 동시에 판독 및 채점
    """
    if not trend_list:
        return None

    # target_date 이하의 네이버 수급 시계열만 필터링 (과거 -> 최신 순으로 정렬)
    valid_trends = [d for d in trend_list if d.get("bizdate", "") <= target_date]
    if not valid_trends:
        valid_trends = trend_list[:]
    valid_trends.sort(key=lambda x: x.get("bizdate", ""))

    # 1) KRX 백데이터를 기본으로 하고, 빈 날짜(KOSDAQ 과거치 및 당일 미반영분)는 네이버 65일 일봉(chart_bars)으로 완벽 보강
    recs_by_date = {r["date"]: dict(r) for r in info["records"]}
    for cb in chart_bars:
        bdate = cb["date"]
        if bdate <= target_date and bdate not in recs_by_date:
            recs_by_date[bdate] = dict(cb)

    # 2) 네이버 /trend 데이터로 최신일 종가/거래량 최종 확인
    for td in valid_trends:
        bdate = td.get("bizdate", "")
        if not bdate or bdate > target_date:
            continue
        c_price = parse_int(td.get("closePrice", 0))
        c_vol = parse_int(td.get("accumulatedTradingVolume", 0))
        c_diff = parse_int(td.get("compareToPreviousClosePrice", 0))
        code_type = str(td.get("compareToPreviousPrice", {}).get("code", "3"))
        if code_type in ["4", "5"] and c_diff > 0:
            c_diff = -c_diff
        prev_close = c_price - c_diff
        fluc_rt = (c_diff / prev_close * 100.0) if prev_close > 0 else 0.0
        est_val = c_price * c_vol

        if bdate not in recs_by_date:
            recs_by_date[bdate] = {
                "date": bdate,
                "close": c_price,
                "open": prev_close if prev_close > 0 else c_price,
                "high": max(c_price, prev_close),
                "low": min(c_price, prev_close),
                "vol": c_vol,
                "val": est_val,
                "rate": round(fluc_rt, 2)
            }

    recs = [recs_by_date[d] for d in sorted(recs_by_date.keys()) if d <= target_date]
    if len(recs) < 15:
        return None

    today = recs[-1]
    curr_price = today["close"]
    curr_vol = today["vol"]
    curr_val_eok = today["val"] / 100_000_000
    curr_rate = today["rate"]

    if curr_price < 1000 or curr_val_eok < 3.0:
        return None

    shrs = info["shrs"]
    turnover = (curr_vol / shrs * 100.0) if shrs > 0 else 0.0

    closes = [r["close"] for r in recs]
    vols = [r["vol"] for r in recs]

    ma20 = sum(closes[-20:]) / min(20, len(closes))
    ma60 = sum(closes[-60:]) / min(60, len(closes))
    disparity20 = (curr_price / ma20 * 100.0) if ma20 > 0 else 100.0

    # 직전 20일 평균 거래량 (당일 제외)
    prev_vols_20 = vols[-21:-1] if len(vols) >= 21 else vols[:-1]
    vol_ma20 = sum(prev_vols_20) / max(1, len(prev_vols_20)) if prev_vols_20 else max(1, curr_vol)
    vol_ratio_20 = curr_vol / vol_ma20 if vol_ma20 > 0 else 1.0

    # 최근 60일 최저가 / 최고가
    low_60 = min(closes[-60:]) if closes else curr_price
    high_60 = max(closes[-60:]) if closes else curr_price
    from_low_60_pct = ((curr_price - low_60) / low_60 * 100.0) if low_60 > 0 else 0.0

    # 네이버 수급 파싱 (최근 20일)
    supply_days = []
    for td in valid_trends:
        f_q = parse_int(td.get("foreignerPureBuyQuant", 0))
        o_q = parse_int(td.get("organPureBuyQuant", 0))
        i_q = parse_int(td.get("individualPureBuyQuant", 0))
        h_r = parse_float(td.get("foreignerHoldRatio", 0.0))
        supply_days.append({
            "date": td.get("bizdate", ""),
            "foreign": f_q,
            "organ": o_q,
            "indiv": i_q,
            "twin": f_q + o_q,
            "hold_ratio": h_r
        })

    today_sup = supply_days[-1]
    f_today = today_sup["foreign"]
    o_today = today_sup["organ"]
    hold_today = today_sup["hold_ratio"]

    recent_10 = supply_days[-10:]
    recent_5 = supply_days[-5:]

    # 최근 10일 중 외인 또는 기관 순매수 일수, 합산 순매수
    f_buy_days_10 = sum(1 for d in recent_10 if d["foreign"] > 0)
    o_buy_days_10 = sum(1 for d in recent_10 if d["organ"] > 0)
    twin_pos_days_10 = sum(1 for d in recent_10 if (d["foreign"] > 0 or d["organ"] > 0))
    sum_f_10 = sum(d["foreign"] for d in recent_10)
    sum_o_10 = sum(d["organ"] for d in recent_10)
    sum_twin_10 = sum_f_10 + sum_o_10
    sum_twin_5 = sum(d["twin"] for d in recent_5)

    # 상장주식수 대비 최근 10일 외인+기관 순매수 지분율(%)
    net_buy_shrs_pct_10 = (sum_twin_10 / shrs * 100.0) if shrs > 0 else 0.0

    # 외인 보유율 변화 (10~20일 전 대비)
    hold_past_10 = recent_10[0]["hold_ratio"] if recent_10 else hold_today
    hold_past_20 = supply_days[0]["hold_ratio"] if supply_days else hold_today
    hold_diff_20 = hold_today - hold_past_20
    hold_diff_10 = hold_today - hold_past_10

    # ==========================================================================
    # 🎯 [알고리즘 1] 대량거래 기준봉 후 '거래량 급감 눌림목 + 수급 홀딩' 판정
    # ==========================================================================
    # 최근 2~14영업일 내 거래량이 평균 대비 1.8배 이상 & 등락률 +4.0% 이상인 기준봉 탐색
    algo1_match = False
    algo1_note = ""
    search_window = recs[-15:-1] if len(recs) >= 3 else []
    best_ref_bar = None
    for r in reversed(search_window):
        r_vol_ratio = r["vol"] / vol_ma20 if vol_ma20 > 0 else 1.0
        if r_vol_ratio >= 1.8 and r["rate"] >= 4.0 and r["vol"] > 0:
            best_ref_bar = r
            break

    if best_ref_bar:
        vol_dryup_ratio = (curr_vol / best_ref_bar["vol"]) * 100.0
        # 조건: 당일 거래량이 기준봉의 60% 이하로 감소 & 주가가 기준봉 저가(또는 20일선 96%) 지지 & 최근 수급 양호
        price_supported = (curr_price >= best_ref_bar["low"] * 0.98) and (curr_price >= ma20 * 0.96)
        supply_held = (sum_twin_5 > 0) or (f_today + o_today > 0)
        not_overheated = -3.5 <= curr_rate <= 8.0
        if vol_dryup_ratio <= 65.0 and price_supported and supply_held and not_overheated:
            algo1_match = True
            algo1_note = (
                f"기준봉({best_ref_bar['date']}, +{best_ref_bar['rate']:.1f}%) 대비 "
                f"거래량 {vol_dryup_ratio:.0f}%로 급감(매물소화) + 20일선 지지 + 수급유지"
            )

    # ==========================================================================
    # 🕵️ [알고리즘 2] 변동성 수축(VCP) + 외인/기관 '조용한 연속 매집' 판정
    # ==========================================================================
    algo2_match = False
    algo2_note = ""
    # 최근 10영업일 중 외인 6일 이상 또는 기관 6일 이상 순매수 & 누적 합산 순매수 양수
    max_buyer_days = max(f_buy_days_10, o_buy_days_10)
    is_steady_buying = (max_buyer_days >= 6 or twin_pos_days_10 >= 7) and (sum_twin_10 > 0)
    # 급등 전 조용한 구간 (당일 등락률 -2.5% ~ +9.5%, 20일선 이격도 96% ~ 112%)
    is_quiet_price = (-2.5 <= curr_rate <= 9.5) and (96.0 <= disparity20 <= 112.0)
    if is_steady_buying and is_quiet_price and net_buy_shrs_pct_10 >= 0.05:
        algo2_match = True
        lead_actor = f"외인 {f_buy_days_10}일" if f_buy_days_10 >= o_buy_days_10 else f"기관 {o_buy_days_10}일"
        algo2_note = (
            f"최근 10일 중 {lead_actor} 순매수(누적 {sum_twin_10:+,}주, 시총대비 +{net_buy_shrs_pct_10:.2f}%) "
            f"+ 이격도 {disparity20:.1f}% 안정권 매집"
        )

    # ==========================================================================
    # 🚀 [알고리즘 3] 과열 배제형(적정 회전율) '초입 진성 거래량 돌파' 판정
    # ==========================================================================
    algo3_match = False
    algo3_note = ""
    # 20일 평균 대비 거래량 1.8배~15배 증가 + 양봉 상승(+2.0% ~ +25.0%) + 회전율 0.8%~22% (초과열 배제) + 메이저 수급 유입
    is_fresh_vol = 1.8 <= vol_ratio_20 <= 18.0
    is_healthy_turn = 0.8 <= turnover <= 22.0
    is_breakout_gain = 2.0 <= curr_rate <= 25.0 and curr_price >= ma20
    has_major_buy = (f_today > 0 and o_today > 0) or (f_today + o_today > 0)
    if is_fresh_vol and is_healthy_turn and is_breakout_gain and has_major_buy and from_low_60_pct <= 65.0:
        algo3_match = True
        supply_tag = "외인+기관 쌍끌이" if (f_today > 0 and o_today > 0) else ("기관 주도" if o_today > f_today else "외인 주도")
        algo3_note = (
            f"20일 평균대비 거래량 {vol_ratio_20:.1f}배 돌파 + 건전 회전율({turnover:.1f}%) "
            f"+ {supply_tag} 유입 (+{curr_rate:.2f}%)"
        )

    # ==========================================================================
    # 📈 [알고리즘 4] 외인 지분율 추세 상승 + 기관 동반 유입 (Smart Money) 판정
    # ==========================================================================
    algo4_match = False
    algo4_note = ""
    best_hold_diff = max(hold_diff_20, hold_diff_10)
    organ_recent_3 = sum(d["organ"] for d in supply_days[-3:])
    if best_hold_diff >= 0.15 and organ_recent_3 > 0 and curr_price >= ma60 * 0.98:
        algo4_match = True
        algo4_note = (
            f"외인보유율 +{best_hold_diff:.2f}%p 상승(현재 {hold_today:.2f}%) "
            f"+ 최근 3일 기관 {organ_recent_3:+,}주 동반 매집"
        )

    # ==========================================================================
    # 🌟 [알고리즘 5] 100점 만점 멀티팩터 종합 채점 시스템
    # ==========================================================================
    # 1) 추세 및 위치 점수 (25점 만점)
    score_trend = 0.0
    if curr_price >= ma20 and ma20 >= ma60:
        score_trend += 15.0  # 완전 정배열
    elif curr_price >= ma20 or curr_price >= ma60:
        score_trend += 9.0   # 부분 정배열 / 추세 회복

    if 98.0 <= disparity20 <= 108.0:
        score_trend += 10.0  # 20일선 최적 눌림/초입 구간
    elif 95.0 <= disparity20 < 98.0 or 108.0 < disparity20 <= 114.0:
        score_trend += 6.0
    elif disparity20 > 120.0:
        score_trend += 1.0   # 단기 이격 과열 감점

    # 2) 거래량 및 회전율 품질 점수 (25점 만점)
    score_vol = 0.0
    if algo1_match:
        score_vol += 15.0    # 기준봉 후 완벽한 거래량 수축 눌림목
    elif 1.8 <= vol_ratio_20 <= 8.0 and curr_rate > 0:
        score_vol += 15.0    # 진성 거래량 돌파
    elif 1.2 <= vol_ratio_20 < 1.8 and curr_rate >= 0:
        score_vol += 10.0
    elif vol_ratio_20 > 8.0 and curr_rate > 0:
        score_vol += 11.0
    else:
        score_vol += 5.0

    if 1.0 <= turnover <= 15.0:
        score_vol += 10.0    # 가장 이상적인 중단기 손바뀜 회전율
    elif 0.3 <= turnover < 1.0 or 15.0 < turnover <= 25.0:
        score_vol += 6.0
    elif turnover > 30.0:
        score_vol += 1.0     # 초단타 과열 감점
    else:
        score_vol += 3.0

    # 3) 수급 강도 점수 (30점 만점)
    score_supply = 0.0
    if f_today > 0 and o_today > 0:
        score_supply += 15.0  # 당일 외인+기관 쌍끌이 양매수
    elif (f_today + o_today) > 0 and (f_today > 0 or o_today > 0):
        score_supply += 10.0  # 당일 외인 또는 기관 주도 순매수
    elif sum_twin_5 > 0:
        score_supply += 5.0

    # 상장주식수 대비 최근 10일 누적 순매수 지분 강도 (최대 15점)
    if net_buy_shrs_pct_10 >= 0.8:
        score_supply += 15.0
    elif net_buy_shrs_pct_10 >= 0.4:
        score_supply += 12.0
    elif net_buy_shrs_pct_10 >= 0.15:
        score_supply += 9.0
    elif net_buy_shrs_pct_10 > 0:
        score_supply += 5.0

    # 4) 수급 연속성 & 알고리즘 포착 시너지 점수 (20점 만점)
    score_cont = 0.0
    if max_buyer_days >= 7:
        score_cont += 10.0
    elif max_buyer_days >= 5:
        score_cont += 7.0
    elif max_buyer_days >= 4:
        score_cont += 4.0

    if best_hold_diff >= 0.3:
        score_cont += 5.0
    elif best_hold_diff >= 0.1:
        score_cont += 3.0

    matched_tags = []
    if algo1_match:
        matched_tags.append("🎯#1눌림목")
    if algo2_match:
        matched_tags.append("🕵️#2연속매집")
    if algo3_match:
        matched_tags.append("🚀#3초입돌파")
    if algo4_match:
        matched_tags.append("📈#4외인지분↑")

    # 알고리즘 다중 포착 보너스 (최대 5점)
    score_cont += min(5.0, len(matched_tags) * 2.0)
    score_cont = min(20.0, score_cont)

    total_score = round(score_trend + score_vol + score_supply + score_cont, 1)

    if total_score >= 80.0:
        grade = "🌟 S등급"
    elif total_score >= 65.0:
        grade = "🏆 A등급"
    elif total_score >= 50.0:
        grade = "✨ B등급"
    else:
        grade = "일반"

    # AI 종합 전략 코멘트 생성
    notes = [n for n in [algo1_note, algo2_note, algo3_note, algo4_note] if n]
    if notes:
        summary_opinion = " / ".join(notes)
    else:
        supply_desc = "외인·기관 양매수" if (f_today > 0 and o_today > 0) else (
            f"최근10일 외인 {f_buy_days_10}일·기관 {o_buy_days_10}일 매수"
        )
        summary_opinion = f"20일이격도 {disparity20:.1f}%, 거래량 {vol_ratio_20:.1f}배, {supply_desc}"

    return {
        "시장": info["market"],
        "종목코드": code,
        "종목명": info["name"],
        "종합점수": total_score,
        "등급": grade,
        "포착알고리즘": " ".join(matched_tags) if matched_tags else "-",
        "종가(원)": f"{curr_price:,}",
        "raw_price": curr_price,
        "등락률(%)": f"{curr_rate:+.2f}%",
        "raw_rate": curr_rate,
        "거래대금(억)": f"{curr_val_eok:,.1f}억",
        "raw_val_eok": curr_val_eok,
        "20일거래량배수": f"{vol_ratio_20:.1f}배",
        "raw_vol_ratio": vol_ratio_20,
        "회전율(%)": f"{turnover:.2f}%",
        "raw_turnover": turnover,
        "20일이격도": f"{disparity20:.1f}%",
        "당일외인순매수": f"{f_today:+,}",
        "당일기관순매수": f"{o_today:+,}",
        "10일외인매수일": f"{f_buy_days_10}/10일",
        "10일기관매수일": f"{o_buy_days_10}/10일",
        "10일합산순매수": f"{sum_twin_10:+,}",
        "시총대비매집(%)": f"{net_buy_shrs_pct_10:+.2f}%",
        "외인보유율": f"{hold_today:.2f}% ({best_hold_diff:+.2f}%p)",
        "추세점수(25)": round(score_trend, 1),
        "거래량점수(25)": round(score_vol, 1),
        "수급강도(30)": round(score_supply, 1),
        "연속성점수(20)": round(score_cont, 1),
        "algo1": algo1_match,
        "algo1_note": algo1_note,
        "algo2": algo2_match,
        "algo2_note": algo2_note,
        "algo3": algo3_match,
        "algo3_note": algo3_note,
        "algo4": algo4_match,
        "algo4_note": algo4_note,
        "AI_전략코멘트": summary_opinion
    }


def run_midterm_gems(target_date=None, min_val_eok=10.0):
    if not target_date:
        target_date = get_naver_latest_bizdate()
    else:
        if not validate_target_date(target_date):
            return

    print("\n" + "=" * 98)
    print(f"💎 [중단기 5대 알고리즘 통합 엔진] 백데이터(60일) + 거래량 + 네이버 수급(20일) 정밀 발굴기")
    print(f"   ▶ 분석 기준일: {target_date} | 대상 시장: KOSPI + KOSDAQ 통합 | 최소 거래대금: {min_val_eok:.0f}억원")
    print("=" * 98)

    stock_series, selected_codes, latest_krx_day = build_universe_and_series(target_date, min_val_eok)
    if not selected_codes:
        print("⚠️ 조건에 부합하는 분석 대상 종목이 없습니다.")
        return

    print(f"▶ [Step 2] 핵심 유동성 후보군 {len(selected_codes)}개 종목의 네이버 65일 시세 & 수급 병렬 수집 중...")
    bundle_map = {}
    with ThreadPoolExecutor(max_workers=16) as executor:
        future_to_code = {executor.submit(fetch_naver_stock_bundle, code, target_date): code for code in selected_codes}
        for future in as_completed(future_to_code):
            c = future_to_code[future]
            try:
                bundle_map[c] = future.result()
            except Exception:
                bundle_map[c] = ([], [])

    print(f"▶ [Step 3] 1~5번 중단기 알고리즘 동시 판독 및 100점 만점 멀티팩터 채점 중...")
    results = []
    for code in selected_codes:
        info = stock_series.get(code)
        t_list, c_bars = bundle_map.get(code, ([], []))
        res = analyze_single_stock(code, info, t_list, c_bars, target_date)
        if res:
            results.append(res)

    if not results:
        print("⚠️ 채점 결과가 비어 있습니다.")
        return

    # 종합점수 내림차순, 거래대금 내림차순 정렬
    results.sort(key=lambda x: (x["종합점수"], x["raw_val_eok"]), reverse=True)
    for idx, r in enumerate(results, 1):
        r["종합순위"] = idx

    df_all = pd.DataFrame(results)

    # 각 파트별 데이터프레임 추출
    df_top30 = df_all.head(30).copy()
    df_algo1 = df_all[df_all["algo1"]].sort_values(by=["종합점수", "raw_val_eok"], ascending=[False, False]).head(20)
    df_algo2 = df_all[df_all["algo2"]].sort_values(by=["종합점수", "raw_val_eok"], ascending=[False, False]).head(20)
    df_algo3 = df_all[df_all["algo3"]].sort_values(by=["종합점수", "raw_val_eok"], ascending=[False, False]).head(20)
    df_algo4 = df_all[df_all["algo4"]].sort_values(by=["종합점수", "raw_val_eok"], ascending=[False, False]).head(20)

    # 콘솔 요약 출력
    print("\n" + "=" * 98)
    print(f"🌟 [Part 1: 알고리즘 5] 100점 만점 멀티팩터 중단기 종합 랭킹 Top 25 (기준일: {target_date})")
    print("=" * 98)
    disp_cols = [
        "종합순위", "등급", "시장", "종목코드", "종목명", "종합점수",
        "종가(원)", "등락률(%)", "거래대금(억)", "10일외인매수일", "10일기관매수일", "포착알고리즘"
    ]
    print(df_top30.head(25)[disp_cols].to_string(index=False))

    part_configs = [
        ("🎯 [Part 2: 알고리즘 1] 대량거래 기준봉 후 '거래량 급감 눌림목 + 수급 홀딩' 종목", df_algo1, "algo1_note"),
        ("🕵️ [Part 3: 알고리즘 2] 변동성 수축(VCP) + 외인/기관 '조용한 연속 매집' 종목", df_algo2, "algo2_note"),
        ("🚀 [Part 4: 알고리즘 3] 과열 배제형(적정 회전율) '초입 진성 거래량 돌파' 종목", df_algo3, "algo3_note"),
        ("📈 [Part 5: 알고리즘 4] 외인 지분율 추세 상승 + 기관 동반 유입 (Smart Money) 종목", df_algo4, "algo4_note"),
    ]

    for title, sub_df, note_col in part_configs:
        print("\n" + "=" * 98)
        print(f"{title} ({len(sub_df)}개 발굴)")
        print("=" * 98)
        if not sub_df.empty:
            sub_cols = ["종합순위", "등급", "시장", "종목코드", "종목명", "종합점수", "종가(원)", "등락률(%)", "거래대금(억)", note_col]
            print(sub_df.head(12)[sub_cols].to_string(index=False))
        else:
            print("   (해당 조건을 만족하는 종목이 없습니다.)")

    # ==========================================================================
    # 파일 저장 (output/ 폴더에 .csv 및 .md 리포트 생성)
    # ==========================================================================
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    csv_path = os.path.join(OUTPUT_DIR, f"midterm_gems_ALL_{target_date}.csv")
    md_path = os.path.join(OUTPUT_DIR, f"midterm_gems_ALL_{target_date}.md")
    json_path = os.path.join(OUTPUT_DIR, f"midterm_gems_ALL_{target_date}.json")
    latest_json_path = os.path.join(OUTPUT_DIR, "midterm_gems_latest.json")

    save_cols = [
        "종합순위", "등급", "종합점수", "시장", "종목코드", "종목명", "포착알고리즘",
        "종가(원)", "등락률(%)", "거래대금(억)", "20일거래량배수", "회전율(%)", "20일이격도",
        "당일외인순매수", "당일기관순매수", "10일외인매수일", "10일기관매수일",
        "10일합산순매수", "시총대비매집(%)", "외인보유율",
        "추세점수(25)", "거래량점수(25)", "수급강도(30)", "연속성점수(20)", "AI_전략코멘트"
    ]
    df_all[save_cols].to_csv(csv_path, index=False, encoding="utf-8-sig")

    # 웹 대시보드(vpe.co.kr/private) 연동용 JSON 파일 동시 저장
    json_payload = {
        "target_date": target_date,
        "krx_base_date": latest_krx_day,
        "min_val_eok": min_val_eok,
        "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "top30_overall": df_top30.to_dict(orient="records"),
        "algo1_pullback": df_algo1.to_dict(orient="records"),
        "algo2_stealth": df_algo2.to_dict(orient="records"),
        "algo3_breakout": df_algo3.to_dict(orient="records"),
        "algo4_smart_money": df_algo4.to_dict(orient="records"),
        "all_evaluated": df_all.to_dict(orient="records")
    }
    for j_path in (json_path, latest_json_path):
        with open(j_path, "w", encoding="utf-8") as jf:
            json.dump(json_payload, jf, ensure_ascii=False, indent=2)

    # 날짜별 JSON 목록 인덱스 파일 생성 (output/midterm_gems_dates.json)
    available_dates = sorted([
        f.replace("midterm_gems_ALL_", "").replace(".json", "")
        for f in os.listdir(OUTPUT_DIR)
        if f.startswith("midterm_gems_ALL_") and f.endswith(".json") and len(f) == len("midterm_gems_ALL_YYYYMMDD.json")
    ], reverse=True)
    dates_index_payload = {
        "latest_date": available_dates[0] if available_dates else target_date,
        "available_dates": available_dates,
        "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    dates_index_path = os.path.join(OUTPUT_DIR, "midterm_gems_dates.json")
    with open(dates_index_path, "w", encoding="utf-8") as djf:
        json.dump(dates_index_payload, djf, ensure_ascii=False, indent=2)

    # GoogleBlog (vpe.co.kr/private) 정적 데이터 폴더가 존재하면 자동 동기화
    candidate_blog_dirs = [
        os.path.abspath(os.path.join(BASE_DIR, "..", "public", "data")),
        os.path.abspath(os.path.join(BASE_DIR, "..", "GoogleBlog", "google-blog", "public", "data")),
    ]
    for blog_data_dir in candidate_blog_dirs:
        if os.path.isdir(blog_data_dir):
            try:
                for fname, payload_obj in [
                    ("midterm_gems_latest.json", json_payload),
                    (f"midterm_gems_ALL_{target_date}.json", json_payload),
                    ("midterm_gems_dates.json", dates_index_payload),
                ]:
                    blog_json_path = os.path.join(blog_data_dir, fname)
                    with open(blog_json_path, "w", encoding="utf-8") as bjf:
                        json.dump(payload_obj, bjf, ensure_ascii=False, indent=2)
                print(f"   ▶ 웹 대시보드 동기화 완료: {blog_data_dir} ({target_date})")
            except Exception as e:
                print(f"   ⚠️ 웹 대시보드 동기화 실패: {e}")

    # Markdown 리포트 작성
    md_lines = [
        f"# 💎 [중단기 5대 알고리즘 통합 리포트] 백데이터 + 거래량 + 네이버 수급 정밀 발굴 ({target_date})\n",
        f"* **분석 기준일:** `{target_date}` (KRX 60일 백데이터 기준일: `{latest_krx_day}` + 네이버 실시간 20일 수급 결합)",
        f"* **대상 시장:** 코스피(KOSPI) + 코스닥(KOSDAQ) 우량 보통주 (최소 거래대금 {min_val_eok:.0f}억 이상)",
        f"* **채점 체계 (100점 만점):** 추세·이격도(25점) + 거래량·회전율 품질(25점) + 수급강도(30점) + 수급연속성·시너지(20점)\n",
        "---\n",
        "## 1. 🌟 [알고리즘 5] 100점 만점 멀티팩터 중단기 종합 랭킹 Top 30\n",
        "| 순위 | 등급 | 점수 | 시장 | 종목코드 | 종목명 | 종가(원) | 등락률 | 거래대금 | 20일이격 | 회전율 | 10일외인 | 10일기관 | 시총대비매집 | 포착 알고리즘 |",
        "| :---: | :---: | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |"
    ]

    for _, r in df_top30.iterrows():
        md_lines.append(
            f"| **{r['종합순위']}** | {r['등급']} | **{r['종합점수']}** | {r['시장']} | `{r['종목코드']}` | **{r['종목명']}** | "
            f"{r['종가(원)']} | {r['등락률(%)']} | {r['거래대금(억)']} | {r['20일이격도']} | {r['회전율(%)']} | "
            f"{r['10일외인매수일']} | {r['10일기관매수일']} | {r['시총대비매집(%)']} | {r['포착알고리즘']} |"
        )

    md_lines.append("\n---\n")

    md_sections = [
        ("2. 🎯 [알고리즘 1] 대량거래 기준봉 후 '거래량 급감 눌림목 + 수급 홀딩' 종목", df_algo1, "algo1_note",
         "최근 15일 내 대량거래 양봉(기준봉) 발생 후, 거래량이 마르며 20일선을 지지하고 외인/기관 수급이 유지되는 스윙 타점"),
        ("3. 🕵️ [알고리즘 2] 변동성 수축(VCP) + 외인/기관 '조용한 연속 매집' 종목", df_algo2, "algo2_note",
         "주가 과열 없이 안정된 이격도에서 최근 10거래일 중 6일 이상 외국인/기관이 꾸준히 지분을 매집한 종목"),
        ("4. 🚀 [알고리즘 3] 과열 배제형(적정 회전율) '초입 진성 거래량 돌파' 종목", df_algo3, "algo3_note",
         "20일 평균 거래량 대비 1.8배 이상 돌파하면서 회전율이 22% 이하로 건전하고 외인/기관 수급이 동반된 초입 돌파주"),
        ("5. 📈 [알고리즘 4] 외인 지분율 추세 상승 + 기관 동반 유입 (Smart Money) 종목", df_algo4, "algo4_note",
         "최근 10~20일간 외국인 보유 지분율이 추세적으로 상승하고 최근 기관 순매수까지 가세한 종목"),
    ]

    for sec_title, sub_df, note_col, desc in md_sections:
        md_lines.append(f"## {sec_title}\n")
        md_lines.append(f"> 💡 **핵심 원리:** {desc}\n")
        if not sub_df.empty:
            md_lines.append("| 종합순위 | 등급 | 점수 | 시장 | 종목코드 | 종목명 | 종가(원) | 등락률 | 거래대금 | 외인보유율 | 핵심 포착 사유 |")
            md_lines.append("| :---: | :---: | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :--- |")
            for _, r in sub_df.iterrows():
                md_lines.append(
                    f"| **{r['종합순위']}** | {r['등급']} | **{r['종합점수']}** | {r['시장']} | `{r['종목코드']}` | **{r['종목명']}** | "
                    f"{r['종가(원)']} | {r['등락률(%)']} | {r['거래대금(억)']} | {r['외인보유율']} | {r[note_col]} |"
                )
            md_lines.append("\n")
        else:
            md_lines.append("* (해당 조건에 부합하는 종목이 없습니다.)\n")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    print("\n" + "=" * 98)
    print(f"💾 [저장 완료] 5대 중단기 알고리즘 통합 분석 결과가 output 폴더에 저장되었습니다!")
    print(f"   ▶ CSV 파일: {os.path.abspath(csv_path)}")
    print(f"   ▶ 마크다운 리포트: {os.path.abspath(md_path)}")
    print("=" * 98 + "\n")


if __name__ == "__main__":
    t_date = sys.argv[1].replace("-", "").replace("/", "") if len(sys.argv) > 1 else None
    min_v = float(sys.argv[2]) if len(sys.argv) > 2 else 10.0
    run_midterm_gems(t_date, min_v)


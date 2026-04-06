#!/usr/bin/env python3

import json
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime
from urllib.error import URLError, HTTPError

FEED_URL = "http://www.lotterynumbersxml.com/lotterydata/me@ianstinson.com-test/5u2u5utu8/lottery.xml"
MEGA_MILLIONS_URL = "https://www.megamillions.com/cmspages/utilservice.asmx/GetLatestDrawData"
POWERBALL_NEXT_DRAWING_URL = "https://www.powerball.com/v1/gameapi/next-drawing?gamecode=powerball&language=en"
POWERBALL_NUMBERS_URL = "https://www.powerball.com/v1/gameapi/numbers?gamecode=powerball&language=en"

NATIONAL_GAMES = {"Powerball", "Powerball Double Play", "Mega Millions"}
FEATURED_STATES = {"GA", "FL", "AR"}
MIN_EXPECTED_STATES = 10
MIN_EXPECTED_RESULTS = 25


def fetch_text(url, data=None, headers=None, retries=5, backoff_seconds=5):
    request_headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/135.0.0.0 Safari/537.36"
        ),
        "Accept": "*/*",
    }
    if headers:
        request_headers.update(headers)

    last_error = None
    for attempt in range(1, retries + 1):
        try:
            request = urllib.request.Request(url, data=data, headers=request_headers)
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read().decode("utf-8")
        except (URLError, HTTPError, ConnectionError, TimeoutError, OSError) as exc:
            last_error = exc
            wait_time = backoff_seconds * attempt
            print(
                f"[fetch_text] attempt {attempt}/{retries} failed for {url}: {exc}",
                file=sys.stderr,
            )
            if attempt < retries:
                time.sleep(wait_time)
    raise RuntimeError(f"Failed to fetch {url} after {retries} attempts: {last_error}")


def format_mmddyyyy(value):
    return datetime.fromisoformat(value).strftime("%m/%d/%Y")


def format_current_update_time():
    return datetime.now().strftime("%a %Y-%m-%d %H:%M:%S EST").upper()


def strip_html(value):
    value = re.sub(r"<[^>]+>", " ", value)
    value = value.replace("&nbsp;", " ").replace("&amp;", "&")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def match_html_text(html, pattern):
    match = re.search(pattern, html, flags=re.IGNORECASE | re.DOTALL)
    return strip_html(match.group(1)) if match else ""


def match_all_html_texts(html, pattern):
    return [strip_html(match.group(1)) for match in re.finditer(pattern, html, flags=re.IGNORECASE | re.DOTALL)]


def jackpot_text_to_int(value):
    cleaned = value.replace("$", "").replace(",", "").strip()
    match = re.match(r"([0-9]+(?:\.[0-9]+)?)\s*(Million|Billion|Thousand)?", cleaned, flags=re.IGNORECASE)
    if not match:
        raise ValueError(f"Could not parse jackpot value: {value}")
    amount = float(match.group(1))
    unit = (match.group(2) or "").lower()
    multiplier = 1
    if unit == "thousand":
        multiplier = 1_000
    elif unit == "million":
        multiplier = 1_000_000
    elif unit == "billion":
        multiplier = 1_000_000_000
    return str(int(round(amount * multiplier)))


def fetch_national_overrides():
    overrides = {}
    current_update_time = format_current_update_time()

    mega_raw = fetch_text(
        MEGA_MILLIONS_URL,
        data=b"{}",
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    mega_payload = json.loads(json.loads(mega_raw)["d"])
    mega_draw = mega_payload["Drawing"]
    mega_jackpot = mega_payload["Jackpot"]
    mega_numbers = "-".join(str(mega_draw[key]).zfill(2) for key in ("N1", "N2", "N3", "N4", "N5"))
    mega_numbers = f"{mega_numbers}, Mega Ball: {str(mega_draw['MBall']).zfill(2)}"
    overrides["Mega Millions"] = {
        "lastdraw_date": format_mmddyyyy(mega_draw["PlayDate"]),
        "lastdraw_numbers": mega_numbers,
        "nextdraw_date": format_mmddyyyy(mega_payload["NextDrawingDate"]),
        "jackpot": str(int(mega_jackpot["NextPrizePool"])),
        "update_time": current_update_time,
    }

    powerball_next_html = fetch_text(POWERBALL_NEXT_DRAWING_URL)
    powerball_numbers_html = fetch_text(POWERBALL_NUMBERS_URL)
    powerball_jackpot_values = match_all_html_texts(
        powerball_next_html,
        r'<span class="game-jackpot-number[^"]*">([\s\S]*?)</span>',
    )
    powerball_draw_date = match_html_text(
        powerball_numbers_html,
        r'<h5 class="card-title[^"]*title-date">([\s\S]*?)</h5>',
    )
    powerball_next_date = match_html_text(
        powerball_next_html,
        r'<h5 class="card-title[^"]*title-date">([\s\S]*?)</h5>',
    )
    powerball_numbers = match_all_html_texts(
        powerball_numbers_html,
        r'<div class="form-control col white-balls item-powerball">([\s\S]*?)</div>',
    )
    powerball_special = match_html_text(
        powerball_numbers_html,
        r'<div class="form-control col powerball item-powerball">([\s\S]*?)</div>',
    )
    powerball_multiplier = match_html_text(
        powerball_numbers_html,
        r'<span class="multiplier">([\s\S]*?)</span>',
    ).replace("x", "")
    powerball_numbers_text = "-".join(str(number).zfill(2) for number in powerball_numbers)
    powerball_numbers_text = f"{powerball_numbers_text}, Powerball: {str(powerball_special).zfill(2)}"
    if powerball_multiplier:
        powerball_numbers_text += f", Power Play: {powerball_multiplier}"

    overrides["Powerball"] = {
        "lastdraw_date": datetime.strptime(powerball_draw_date, "%a, %b %d, %Y").strftime("%m/%d/%Y"),
        "lastdraw_numbers": powerball_numbers_text,
        "nextdraw_date": datetime.strptime(powerball_next_date, "%a, %b %d, %Y").strftime("%m/%d/%Y"),
        "jackpot": jackpot_text_to_int(powerball_jackpot_values[0]),
        "update_time": current_update_time,
    }

    return overrides


def slugify(value):
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "game"


def parse_numbers(text):
    if not text:
        return [], None

    main_text = text
    special = None

    if "," in text:
        segments = [segment.strip() for segment in text.split(",")]
        main_text = segments[0]
        for segment in segments[1:]:
            if ":" not in segment:
                continue
            label, value = [part.strip() for part in segment.split(":", 1)]
            match = re.search(r"(\d{1,2})\s*$", value)
            if not match:
                continue
            if label.lower() in {"powerball", "mega ball", "bonus"}:
                special = match.group(1).zfill(2)
                break

    numbers = [item.zfill(2) for item in re.findall(r"\d{1,2}", main_text)]
    return numbers, special


def format_jackpot(jackpot_text):
    if not jackpot_text:
        return "Rolling"
    try:
        value = int(jackpot_text)
    except ValueError:
        return jackpot_text
    if value >= 1_000_000:
        trimmed = value / 1_000_000
        if trimmed.is_integer():
            return f"${int(trimmed)}M"
        return f"${trimmed:.1f}M"
    if value >= 1_000:
        trimmed = value / 1_000
        if trimmed.is_integer():
            return f"${int(trimmed)}K"
        return f"${trimmed:.1f}K"
    return f"${value}"


def normalize_game(state, game, national_overrides=None):
    national_overrides = national_overrides or {}
    game_name = game.attrib.get("game_name", "Lottery Game")
    override = national_overrides.get(game_name, {})

    lastdraw_numbers = override.get("lastdraw_numbers", game.findtext("lastdraw_numbers", "").strip())
    nextdraw = game.find("nextdraw_date")
    jackpot = game.find("jackpot")
    numbers, special = parse_numbers(lastdraw_numbers)
    state_id = state.attrib.get("stateprov_id", "")
    state_name = state.attrib.get("stateprov_name", "")

    game_type = "national" if game_name in NATIONAL_GAMES else "state"
    tag = "National draw" if game_type == "national" else f"{state_name} game"
    raw_jackpot_value = override.get("jackpot")
    if raw_jackpot_value is None and jackpot is not None and jackpot.text:
        raw_jackpot_value = jackpot.text.strip()
    if raw_jackpot_value is None and nextdraw is not None and "top_prize" in nextdraw.attrib:
        raw_jackpot_value = nextdraw.attrib["top_prize"]
    jackpot_text = format_jackpot(raw_jackpot_value) if raw_jackpot_value else "Rolling"

    detail_a_label = "Special" if special else "Numbers"
    detail_a_value = "Included" if special else f"{len(numbers)} drawn"
    if "Power Play" in lastdraw_numbers:
        match = re.search(r"Power Play:\s*([0-9Xx]+)", lastdraw_numbers)
        if match:
            detail_a_label, detail_a_value = "Power Play", match.group(1)
    elif "Mega Ball" in lastdraw_numbers:
        detail_a_label, detail_a_value = "Bonus", "Mega Ball"
    elif "Bonus" in lastdraw_numbers:
        detail_a_label, detail_a_value = "Bonus", "Included"

    detail_b_label = "Next draw"
    detail_b_value = override.get("nextdraw_date") or (nextdraw.text.strip() if nextdraw is not None and nextdraw.text else "TBD")

    detail_c_label = "Updated"
    detail_c_value = override.get("update_time") or game.attrib.get("update_time", "Feed update pending")

    return {
        "id": f"{state_id.lower()}-{slugify(game.attrib.get('game_id', game_name))}",
        "type": game_type,
        "name": game_name,
        "state": state_name,
        "stateId": state_id,
        "tag": tag,
        "jackpot": jackpot_text,
        "lastDraw": override.get("lastdraw_date") or game.findtext("lastdraw_date", "").strip() or "TBD",
        "numbers": numbers,
        "special": special,
        "detailA": [detail_a_label, detail_a_value],
        "detailB": [detail_b_label, detail_b_value],
        "detailC": [detail_c_label, detail_c_value],
    }


def build_payload(root, national_overrides=None):
    states = root.findall("StateProv")
    normalized = []
    seen_national = set()

    for state in states:
        for game in state.findall("game"):
            item = normalize_game(state, game, national_overrides)
            if item["type"] == "national":
                key = item["name"]
                if key in seen_national:
                    continue
                seen_national.add(key)
            normalized.append(item)

    featured = []
    national = [item for item in normalized if item["type"] == "national"]
    featured.extend(national[:3])

    for state_id in FEATURED_STATES:
        match = next((item for item in normalized if item["stateId"] == state_id and item["type"] == "state"), None)
        if match:
            featured.append(match)

    featured_ids = {item["id"] for item in featured}
    featured.extend([item for item in normalized if item["id"] not in featured_ids][: max(0, 6 - len(featured))])

    national_count = len([item for item in normalized if item["type"] == "national"])
    state_game_count = len([item for item in normalized if item["type"] == "state"])
    game_names = sorted({item["name"] for item in normalized})

    return {
        "heroStats": [
            f"Updated {featured[0]['detailC'][1]}" if featured else "Feed update pending",
            f"{len(states)} states tracked",
            f"{len(normalized)} active game records",
        ],
        "results": normalized,
        "featuredResults": featured[:6],
        "generatedFrom": FEED_URL,
        "meta": {
            "stateCount": len(states),
            "resultCount": len(normalized),
            "nationalCount": national_count,
            "stateGameCount": state_game_count,
            "featuredCount": len(featured[:6]),
            "gameNames": game_names,
        },
    }


def validate_payload(payload):
    state_count = payload.get("meta", {}).get("stateCount", 0)
    result_count = payload.get("meta", {}).get("resultCount", 0)
    if state_count < MIN_EXPECTED_STATES:
        raise ValueError(f"Feed validation failed: expected at least {MIN_EXPECTED_STATES} states but found {state_count}")
    if result_count < MIN_EXPECTED_RESULTS:
        raise ValueError(f"Feed validation failed: expected at least {MIN_EXPECTED_RESULTS} results but found {result_count}")
    if not payload.get("results"):
        raise ValueError("Feed validation failed: no results were parsed")


def main():
    output_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "results-feed.js"
    with urllib.request.urlopen(FEED_URL) as response:
        xml_bytes = response.read()

    root = ET.fromstring(xml_bytes)
    national_overrides = fetch_national_overrides()
    payload = build_payload(root, national_overrides)
    validate_payload(payload)
    output = "window.resultsFeedData = " + json.dumps(payload, indent=2) + ";\n"
    output_path.write_text(output, encoding="utf-8")
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()

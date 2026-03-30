#!/usr/bin/env python3

import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

FEED_URL = "http://www.lotterynumbersxml.com/lotterydata/me@ianstinson.com-test/5u2u5utu8/lottery.xml"

NATIONAL_GAMES = {"Powerball", "Powerball Double Play", "Mega Millions"}
FEATURED_STATES = {"GA", "FL", "AR"}
MIN_EXPECTED_STATES = 10
MIN_EXPECTED_RESULTS = 25


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


def normalize_game(state, game):
    lastdraw_numbers = game.findtext("lastdraw_numbers", "").strip()
    nextdraw = game.find("nextdraw_date")
    jackpot = game.find("jackpot")
    numbers, special = parse_numbers(lastdraw_numbers)
    state_id = state.attrib.get("stateprov_id", "")
    state_name = state.attrib.get("stateprov_name", "")
    game_name = game.attrib.get("game_name", "Lottery Game")

    game_type = "national" if game_name in NATIONAL_GAMES else "state"
    tag = "National draw" if game_type == "national" else f"{state_name} game"
    jackpot_text = format_jackpot(jackpot.text.strip()) if jackpot is not None and jackpot.text else (
        format_jackpot(nextdraw.attrib["top_prize"]) if nextdraw is not None and "top_prize" in nextdraw.attrib else "Rolling"
    )

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
    detail_b_value = nextdraw.text.strip() if nextdraw is not None and nextdraw.text else "TBD"

    detail_c_label = "Updated"
    detail_c_value = game.attrib.get("update_time", "Feed update pending")

    return {
        "id": f"{state_id.lower()}-{slugify(game.attrib.get('game_id', game_name))}",
        "type": game_type,
        "name": game_name,
        "state": state_name,
        "stateId": state_id,
        "tag": tag,
        "jackpot": jackpot_text,
        "lastDraw": game.findtext("lastdraw_date", "").strip() or "TBD",
        "numbers": numbers,
        "special": special,
        "detailA": [detail_a_label, detail_a_value],
        "detailB": [detail_b_label, detail_b_value],
        "detailC": [detail_c_label, detail_c_value],
    }


def build_payload(root):
    states = root.findall("StateProv")
    normalized = []
    seen_national = set()

    for state in states:
        for game in state.findall("game"):
            item = normalize_game(state, game)
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
    payload = build_payload(root)
    validate_payload(payload)
    output = "window.resultsFeedData = " + json.dumps(payload, indent=2) + ";\n"
    output_path.write_text(output, encoding="utf-8")
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()

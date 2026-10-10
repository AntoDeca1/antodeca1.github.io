"""Refresh only the aggregate counts already visible on the public GitHub profile.

No authentication, third-party statistics service, or private repository metadata.
GitHub's HTML can change; a failed refresh keeps the last validated snapshot.
"""

import argparse
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.request import Request, urlopen

USERNAME = "AntoDeca1"
SOURCE = f"https://github.com/users/{USERNAME}/contributions"
DESTINATION = Path(__file__).resolve().parents[1] / "site/data/contributions.json"


class CalendarParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cells = {}
        self.tips = {}
        self.tip_id = None
        self.tip_text = []
        self.heading = False
        self.heading_text = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "td" and attrs.get("data-date"):
            self.cells[attrs["id"]] = {
                "date": attrs["data-date"], "level": int(attrs["data-level"])
            }
        elif tag == "tool-tip" and attrs.get("for"):
            self.tip_id = attrs["for"]
            self.tip_text = []
        elif tag == "h2" and attrs.get("id") == "js-contribution-activity-description":
            self.heading = True

    def handle_data(self, data):
        if self.tip_id:
            self.tip_text.append(data)
        if self.heading:
            self.heading_text.append(data)

    def handle_endtag(self, tag):
        if tag == "tool-tip" and self.tip_id:
            self.tips[self.tip_id] = "".join(self.tip_text).strip()
            self.tip_id = None
        elif tag == "h2":
            self.heading = False


def parse_calendar(html, updated_at=None):
    parser = CalendarParser()
    parser.feed(html)
    days = []
    for cell_id, cell in parser.cells.items():
        label = parser.tips.get(cell_id, "")
        match = re.match(r"(No|[\d,]+) contributions? on ", label)
        if not match:
            raise ValueError(f"Missing contribution count for {cell['date']}")
        count = 0 if match[1] == "No" else int(match[1].replace(",", ""))
        if cell["level"] not in range(5) or count < 0:
            raise ValueError("Invalid contribution value")
        days.append({**cell, "count": count})
    days.sort(key=lambda day: day["date"])
    if not 365 <= len(days) <= 371:
        raise ValueError(f"Expected a complete year of activity, got {len(days)} days")
    first = date.fromisoformat(days[0]["date"])
    for i, day in enumerate(days):
        if date.fromisoformat(day["date"]) != first + timedelta(days=i):
            raise ValueError("Calendar dates are missing or duplicated")
    if (date.today() - date.fromisoformat(days[-1]["date"])).days not in range(3):
        raise ValueError("GitHub returned a stale calendar")
    total_match = re.match(r"\s*([\d,]+)\s+contributions", "".join(parser.heading_text))
    if not total_match:
        raise ValueError("Missing GitHub contribution total")
    github_total = int(total_match[1].replace(",", ""))
    displayed_total = sum(day["count"] for day in days)
    # Keep GitHub's total, which can exclude the extra days completing the first week.
    if github_total > displayed_total:
        raise ValueError("GitHub total exceeds the complete calendar")
    return {
        "username": USERNAME,
        "source": SOURCE,
        "profileUrl": f"https://github.com/{USERNAME}",
        "updatedAt": updated_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "total": github_total,
        "startDate": days[0]["date"],
        "endDate": days[-1]["date"],
        "days": days,
    }


def main():
    arguments = argparse.ArgumentParser()
    arguments.add_argument("--html", type=Path, help="Parse a saved public response for local validation")
    args = arguments.parse_args()
    try:
        if args.html:
            html = args.html.read_text()
        else:
            request = Request(SOURCE, headers={"User-Agent": "AntonioDeCandia-Portfolio", "Accept": "text/html"})
            with urlopen(request, timeout=30) as response:
                html = response.read().decode("utf-8")
        calendar = parse_calendar(html)
        DESTINATION.parent.mkdir(parents=True, exist_ok=True)
        temporary = DESTINATION.with_suffix(".tmp")
        temporary.write_text(json.dumps(calendar, separators=(",", ":")) + "\n")
        temporary.replace(DESTINATION)
        print(f"Updated {len(calendar['days'])} days; {calendar['total']} contributions.")
    except Exception as error:
        if not DESTINATION.exists():
            raise
        print(f"::warning::Contribution refresh failed; keeping the previous snapshot: {error}", file=sys.stderr)


if __name__ == "__main__":
    main()

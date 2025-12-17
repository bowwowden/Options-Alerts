#!/usr/bin/env python3
"""
Run snapshot fetcher continuously until 4:30 PM EST (market close)

This script will fetch snapshots every N minutes until 4:30 PM EST.
"""

import time
from datetime import datetime, timezone
import pytz
from fetch_snapshots import fetch_and_save_snapshots

# Configuration
FETCH_INTERVAL_SECONDS = 60  # Fetch every 60 seconds (1 minute)
END_HOUR = 16  # 4 PM
END_MINUTE = 30  # 30 minutes
EST = pytz.timezone('US/Eastern')

# OCC symbols to fetch
OCC_SYMBOLS = [
    "SPY251027C00681000",
    "SPY251027C00683000",
    "RVTY251121P00095000",
    "BOH251121C00065000",
]


def should_continue_running():
    """Check if we should continue running (before 4:30 PM EST)"""
    now_est = datetime.now(EST)

    # Check if we've passed 4:30 PM EST
    if now_est.hour > END_HOUR:
        return False
    if now_est.hour == END_HOUR and now_est.minute >= END_MINUTE:
        return False

    return True


def main():
    print("=" * 70)
    print("Continuous Snapshot Fetcher")
    print("=" * 70)
    print(f"Symbols: {len(OCC_SYMBOLS)}")
    print(f"Fetch interval: {FETCH_INTERVAL_SECONDS} seconds")
    print(f"Will run until: 4:30 PM EST")
    print(f"Current time (EST): {datetime.now(EST).strftime('%Y-%m-%d %H:%M:%S %Z')}")
    print("=" * 70)
    print()

    if not should_continue_running():
        print("Market has closed (past 4:30 PM EST). Exiting.")
        return

    fetch_count = 0

    try:
        while should_continue_running():
            fetch_count += 1
            now_est = datetime.now(EST)

            print(f"\n[Fetch #{fetch_count}] {now_est.strftime('%H:%M:%S EST')}")
            print("-" * 70)

            # Fetch snapshots
            results = fetch_and_save_snapshots(OCC_SYMBOLS)

            # Check if we should continue
            if not should_continue_running():
                print("\nReached 4:30 PM EST - stopping.")
                break

            # Wait before next fetch
            print(f"\nWaiting {FETCH_INTERVAL_SECONDS} seconds until next fetch...")
            time.sleep(FETCH_INTERVAL_SECONDS)

    except KeyboardInterrupt:
        print("\n\nStopped by user (Ctrl+C)")

    print("\n" + "=" * 70)
    print(f"Session Summary:")
    print(f"  Total fetches: {fetch_count}")
    print(f"  End time: {datetime.now(EST).strftime('%Y-%m-%d %H:%M:%S EST')}")
    print("=" * 70)


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Standalone script to fetch option snapshots and append to files

Usage:
    python3 fetch_snapshots.py

This script fetches snapshots for a list of OCC symbols and appends
the data to individual JSON files for each symbol.
"""

import json
import os
from datetime import datetime
from alpaca.data import OptionHistoricalDataClient
from alpaca.data.requests import OptionSnapshotRequest

# Configuration - Update these with your API keys
API_KEY = os.environ.get('ALPACA_API_KEY', '')
API_SECRET = os.environ.get('ALPACA_API_SECRET', '')

# Alternatively, hardcode them here (not recommended for production)
if not API_KEY or not API_SECRET:
    try:
        import sys
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
        import config
        API_KEY = config.api_key
        API_SECRET = config.api_secret
    except ImportError:
        print("Error: API keys not found. Set ALPACA_API_KEY and ALPACA_API_SECRET environment variables")
        exit(1)

# Directory to store snapshot files
SNAPSHOTS_DIR = "snapshots"

# Initialize Alpaca client
option_client = OptionHistoricalDataClient(
    api_key=API_KEY,
    secret_key=API_SECRET
)


def fetch_snapshot(occ_symbol):
    """
    Fetch snapshot data for a single OCC symbol

    Args:
        occ_symbol: OCC formatted option symbol (e.g., "SPY251027C00681000")

    Returns:
        dict: Snapshot data or None if error
    """
    try:
        request_params = OptionSnapshotRequest(symbol_or_symbols=occ_symbol)
        snapshots = option_client.get_option_snapshot(request_params)

        if occ_symbol not in snapshots:
            return None

        snapshot = snapshots[occ_symbol]

        # Build snapshot data dictionary
        snapshot_data = {
            'symbol': occ_symbol,
            'timestamp': datetime.utcnow().isoformat(),
            'quote': {},
            'trade': {},
            'greeks': {}
        }

        # Extract quote data
        if snapshot.latest_quote:
            snapshot_data['quote'] = {
                'timestamp': snapshot.latest_quote.timestamp.isoformat() if snapshot.latest_quote.timestamp else None,
                'bid_price': snapshot.latest_quote.bid_price,
                'ask_price': snapshot.latest_quote.ask_price,
                'bid_size': snapshot.latest_quote.bid_size,
                'ask_size': snapshot.latest_quote.ask_size,
            }

        # Extract last trade data
        if snapshot.latest_trade:
            snapshot_data['trade'] = {
                'timestamp': snapshot.latest_trade.timestamp.isoformat() if snapshot.latest_trade.timestamp else None,
                'price': snapshot.latest_trade.price,
                'size': snapshot.latest_trade.size,
            }

        # Extract greeks if available
        if hasattr(snapshot, 'greeks') and snapshot.greeks:
            snapshot_data['greeks'] = {
                'delta': getattr(snapshot.greeks, 'delta', None),
                'gamma': getattr(snapshot.greeks, 'gamma', None),
                'theta': getattr(snapshot.greeks, 'theta', None),
                'vega': getattr(snapshot.greeks, 'vega', None),
                'implied_volatility': getattr(snapshot.greeks, 'implied_volatility', None),
            }

        return snapshot_data

    except Exception as e:
        print(f"Error fetching snapshot for {occ_symbol}: {e}")
        return None


def append_snapshot_to_file(occ_symbol, snapshot_data):
    """
    Append snapshot data to a JSON file for the symbol

    Args:
        occ_symbol: OCC symbol
        snapshot_data: Snapshot data dictionary
    """
    # Create snapshots directory if it doesn't exist
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

    # Generate filename from OCC symbol
    filename = f"{occ_symbol}.json"
    filepath = os.path.join(SNAPSHOTS_DIR, filename)

    # Load existing data if file exists
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
                if not isinstance(data, list):
                    data = [data]  # Convert single object to list
        except (json.JSONDecodeError, IOError):
            data = []
    else:
        data = []

    # Append new snapshot
    data.append(snapshot_data)

    # Write back to file
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"✓ Appended snapshot to {filepath}")


def fetch_and_save_snapshots(occ_symbols):
    """
    Fetch snapshots for a list of OCC symbols and save to files

    Args:
        occ_symbols: List of OCC symbol strings

    Returns:
        dict: Summary with success/failure counts
    """
    print(f"\n{'=' * 60}")
    print(f"Fetching snapshots for {len(occ_symbols)} symbol(s)")
    print(f"{'=' * 60}\n")

    success_count = 0
    failure_count = 0

    for occ_symbol in occ_symbols:
        print(f"Fetching {occ_symbol}...", end=" ")

        snapshot_data = fetch_snapshot(occ_symbol)

        if snapshot_data:
            append_snapshot_to_file(occ_symbol, snapshot_data)
            success_count += 1
        else:
            print(f"✗ No data available")
            failure_count += 1

    print(f"\n{'=' * 60}")
    print(f"Summary:")
    print(f"  Success: {success_count}")
    print(f"  Failed:  {failure_count}")
    print(f"{'=' * 60}\n")

    return {
        'success': success_count,
        'failed': failure_count
    }


if __name__ == "__main__":
    # Example OCC symbols - modify this list as needed
    occ_symbols = [
        "SPY251027C00681000",
        "SPY251027C00683000",
        "RVTY251121P00095000",
        "BOH251121C00065000",
    ]

    print("Standalone Options Snapshot Fetcher")
    print("=" * 60)
    print(f"Target directory: {SNAPSHOTS_DIR}/")
    print(f"Symbols to fetch: {len(occ_symbols)}")

    # Fetch and save snapshots
    results = fetch_and_save_snapshots(occ_symbols)

    print(f"Done! Check the '{SNAPSHOTS_DIR}/' directory for results.")
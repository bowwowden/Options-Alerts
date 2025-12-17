# Download historical data for options

from alpaca.data import OptionHistoricalDataClient
from alpaca.data.requests import OptionBarsRequest, OptionSnapshotRequest
from alpaca.data.timeframe import TimeFrame
import config
from models import db, FreshPlay
from app import app
from datetime import datetime, timezone
import utils.order_reader as order_fetcher

# Initialize Alpaca option client
option_client = OptionHistoricalDataClient(
    api_key=config.api_key,
    secret_key=config.api_secret
)

def fetch_option_bars(occ_symbol, start_time, end_time, save_to_file=True, timeframe=None):
    """
    Fetch option bars for a specific OCC symbol within a time range

    Args:
        occ_symbol: OCC formatted option symbol (e.g., "F251031C00012500")
        start_time: Start datetime (timezone-aware)
        end_time: End datetime (timezone-aware)
        save_to_file: Whether to save bars data to a JSON file (default: True)
        timeframe: TimeFrame object (default: TimeFrame.Minute)

    Returns:
        list: List of bar objects, or empty list if error/no data
    """
    import json
    import os

    # Default to 1 minute bars if not specified
    if timeframe is None:
        timeframe = TimeFrame.Minute

    print(f"\nFetching bars for: {occ_symbol}")
    print(f"Date range: {start_time} to {end_time}")
    print(f"Timeframe: {timeframe}")

    try:
        # Request option bars data
        request_params = OptionBarsRequest(
            symbol_or_symbols=occ_symbol,
            timeframe=timeframe,
            start=start_time,
            end=end_time
        )

        bars = option_client.get_option_bars(request_params)

        # Try to get the bars data
        bars_list = []
        if hasattr(bars, 'data') and bars.data:
            # It's a BarSet with a data dict
            if occ_symbol in bars.data:
                bars_list = list(bars.data[occ_symbol])
        elif occ_symbol in bars:
            # Direct access
            bars_list = list(bars[occ_symbol]) if bars[occ_symbol] else []

        # Process if we have data
        if bars_list:

            print(f"\nSuccess! Received {len(bars_list)} bars")
            print("\nFirst 5 bars:")

            for i, bar in enumerate(bars_list[:5]):
                print(f"  {bar.timestamp}: Open=${bar.open}, High=${bar.high}, Low=${bar.low}, Close=${bar.close}, Volume={bar.volume}")

            if len(bars_list) > 5:
                print(f"  ... and {len(bars_list) - 5} more bars")

            # Save to file if requested
            if save_to_file:
                # Create directory if it doesn't exist
                bars_dir = "historical_bars"
                os.makedirs(bars_dir, exist_ok=True)

                # Create filename: {occ_symbol}_{end_date}_{start_date}.json
                end_date_str = end_time.strftime("%Y%m%d")
                start_date_str = start_time.strftime("%Y%m%d")

                # If same day, use old format for backward compatibility
                if end_date_str == start_date_str:
                    filename = f"{occ_symbol}_{end_date_str}.json"
                else:
                    filename = f"{occ_symbol}_{end_date_str}_{start_date_str}.json"

                filepath = os.path.join(bars_dir, filename)

                # Convert bars to JSON-serializable format
                bars_data = []
                for bar in bars_list:
                    bars_data.append({
                        'timestamp': bar.timestamp.isoformat(),
                        'open': bar.open,
                        'high': bar.high,
                        'low': bar.low,
                        'close': bar.close,
                        'volume': bar.volume,
                        'trade_count': bar.trade_count if hasattr(bar, 'trade_count') else None,
                        'vwap': bar.vwap if hasattr(bar, 'vwap') else None,
                        'symbol': occ_symbol
                    })

                # Write to file
                with open(filepath, 'w') as f:
                    json.dump({
                        'symbol': occ_symbol,
                        'start_time': start_time.isoformat(),
                        'end_time': end_time.isoformat(),
                        'bar_count': len(bars_data),
                        'bars': bars_data
                    }, f, indent=2)

                print(f"\n✓ Saved {len(bars_data)} bars to: {filepath}")

            return bars_list
        else:
            print("No bars data returned for this symbol")
            return []

    except Exception as e:
        print(f"Error fetching bars: {e}")
        return []

def fetch_option_snapshot(occ_symbol):
    """
    Fetch current snapshot data for a specific OCC symbol

    Args:
        occ_symbol: OCC formatted option symbol (e.g., "KDP251031C00029000")

    Returns:
        dict: Snapshot data including bid/ask, last trade, and greeks (if available)
              Returns None if no data is available or error occurs
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
            'timestamp': None,
            'bid': None,
            'ask': None,
            'bid_size': None,
            'ask_size': None,
            'last_trade_price': None,
            'last_trade_size': None,
            'last_trade_timestamp': None,
        }

        # Extract quote data
        if snapshot.latest_quote:
            snapshot_data['timestamp'] = snapshot.latest_quote.timestamp
            snapshot_data['bid'] = snapshot.latest_quote.bid_price
            snapshot_data['ask'] = snapshot.latest_quote.ask_price
            snapshot_data['bid_size'] = snapshot.latest_quote.bid_size
            snapshot_data['ask_size'] = snapshot.latest_quote.ask_size

        # Extract last trade data
        if snapshot.latest_trade:
            snapshot_data['last_trade_price'] = snapshot.latest_trade.price
            snapshot_data['last_trade_size'] = snapshot.latest_trade.size
            snapshot_data['last_trade_timestamp'] = snapshot.latest_trade.timestamp

        # Extract greeks if available
        if hasattr(snapshot, 'greeks') and snapshot.greeks:
            snapshot_data['delta'] = getattr(snapshot.greeks, 'delta', None)
            snapshot_data['gamma'] = getattr(snapshot.greeks, 'gamma', None)
            snapshot_data['theta'] = getattr(snapshot.greeks, 'theta', None)
            snapshot_data['vega'] = getattr(snapshot.greeks, 'vega', None)
            snapshot_data['implied_volatility'] = getattr(snapshot.greeks, 'implied_volatility', None)

        return snapshot_data

    except Exception as e:
        print(f"Error fetching snapshot for {occ_symbol}: {e}")
        return None

def test_with_fresh_plays():
    """
    Test fetching bars for a hardcoded SPY option
    """
    # Hardcoded SPY OCC symbol
    # occ_symbol = "SPY251027C00681000"
    occ_symbol = "SPY251027C00683000"

    print(f"Testing with OCC symbol: {occ_symbol}")

    # Use today's date: October 27, 2025
    # Market hours: 9:30 AM to 4:00 PM ET (13:30 to 20:00 UTC)
    start_time = datetime(2025, 10, 27, 13, 30, tzinfo=timezone.utc)  # 9:30 am ET
    end_time = datetime(2025, 10, 27, 20, 0, tzinfo=timezone.utc)    # 4:00 pm ET

    bars = fetch_option_bars(occ_symbol, start_time, end_time)

    if bars:
        print(f"\n✓ Successfully fetched {len(bars)} bars!")
    else:
        print(f"\n✗ No data returned for {occ_symbol}")

if __name__ == "__main__":
    test_with_fresh_plays()


# Wrap everything together

# 1. Scrape article
from utils import scraper
import utils.order_reader as order_fetcher

# Skip this for now.
scraper.scrape_article()

exit()
# Need text
print("Extract options Positions: ")
data = scraper.write_fresh_plays_files("backend/utils/articles/Thursdays_Runs_5-Pack_of_New_Chances_10-24-2025.txt")
print(data)

# 3. Fetch prices from alpaca, or trade.

import config

url='https://paper-api.alpaca.markets/v2/account'

# first order of business, learn how to buy / sell an option
api_key = config.api_key
secret_key = config.api_secret

from alpaca.data import OptionHistoricalDataClient, StockHistoricalDataClient
from alpaca.data.requests import OptionLatestQuoteRequest

option_client = OptionHistoricalDataClient(api_key=api_key, secret_key=secret_key)
stock_client = StockHistoricalDataClient(api_key=api_key, secret_key=secret_key)

# format fresh plays for alpaca
fresh_plays = order_fetcher.grab_yesterday_fresh_plays()

print("Fresh plays")
orders = order_fetcher.format_options_with_occ_symbol(fresh_plays)
print(orders)

# Need to fetch orders. use order - fetcher?
multisymbol_request_params = OptionLatestQuoteRequest(symbol_or_symbols=orders)
latest_multisymbol_quotes = option_client.get_option_latest_quote(multisymbol_request_params)

# got latest quotes, now i need to append them to a csv per day.
# there are 390 minutes in a trading day, so appending 390 * 4 ish quotes per csv file seems manageable.

# print(latest_multisymbol_quotes)

# alternatively use an optin chain

from alpaca.data.requests import OptionChainRequest


# example tesla chain, gigantic. website prolly needs a simple feature to view option chains.
import time
import json
from datetime import datetime, timezone


def fetch_chains_sixty_minutes():
    SYMBOL = "TSLA"
    RUN_MINUTES = 60
    INTERVAL = 60
    for i in range(RUN_MINUTES):
        try:
            option_req = OptionChainRequest(underlying_symbol=SYMBOL)

            chain = option_client.get_option_chain(option_req)

            # convert to JSON-serializable dict
            chain_dict = {
                k: v.dict() if hasattr(v, "dict") else v
                for k, v in chain.items()
            }

            # timestamped filename
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{SYMBOL}_chain_{ts}.json"

            # write file
            with open(filename, "w") as f:
                json.dump(chain_dict, f, indent=2, default=str)

            print(f"[{i + 1}/{RUN_MINUTES}] Saved {filename}")

        except Exception as e:
            print("Error fetching chain:", e)

            # wait for next iteration
        if i < RUN_MINUTES - 1:
            time.sleep(INTERVAL)

# Massive files, 4.5 mb each
# fetch_chains_sixty_minutes()

from alpaca.data.requests import OptionSnapshotRequest

# # Next let's fetch a snapshot
# for contract in orders:
#     print("For contract")
#     print(contract)
#
#     snapshot_request = OptionSnapshotRequest(symbol_or_symbols=contract)
#
#     snapshot = option_client.get_option_snapshot(snapshot_request)
#     print(snapshot)

# Historical Options Bars

from alpaca.data.requests import OptionBarsRequest

from alpaca.data import OptionHistoricalDataClient
from alpaca.data.timeframe import TimeFrame
option_client = OptionHistoricalDataClient(api_key, secret_key)

contract = orders[0]
print(contract)
request_params = OptionBarsRequest(symbol_or_symbols=contract,
                                   timeframe=TimeFrame.Minute,
                                   start=datetime(2025,10,24, 13, 30, tzinfo=timezone.utc), # 9:30 am et
                                   end=datetime(2025,10,24, 20, 0, tzinfo=timezone.utc)  # 4:00 pm et
                                   )


bars =  option_client.get_option_bars(request_params)
# Convert bars to JSON-serializable format
print("bars")
print(type(bars))

# timestamped filename
ts = datetime.now().strftime("%Y%m%d_%H%M%S")
filename = f"{contract}_chain_{ts}.json"

bars_list = []

# BarSet is keyed by symbol, but since we requested one contract we can just iterate
for bar in bars[contract]:  # iterate over Bar objects
    bars_list.append({
        'symbol': bar.symbol,
        'timestamp': bar.timestamp.isoformat(),  # Bar.timestamp is a datetime
        'open': bar.open,
        'high': bar.high,
        'low': bar.low,
        'close': bar.close,
        'volume': bar.volume,
        'trade_count': getattr(bar, 'trade_count', None),
        'vwap': getattr(bar, 'vwap', None),
    })

# Wrap in dict keyed by contract symbol
data_to_write = {contract: bars_list}

# Write to JSON file
with open(filename, 'w') as f:
    json.dump(data_to_write, f, indent=2)

print(f"Saved {len(bars_list)} bars to {filename}")
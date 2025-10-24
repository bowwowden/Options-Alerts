
# Wrap everything together

# 1. Scrape article
from backend import utils as scraper
import backend.utils.order_reader as order_fetcher

# Skip this for now.
# scraper.scrape_article()

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
from datetime import datetime


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

# Next let's fetch a snapshot
for contract in orders:
    print("For contract")
    print(contract)

    snapshot_request = OptionSnapshotRequest(symbol_or_symbols=contract)

    snapshot = option_client.get_option_snapshot(snapshot_request)
    print(snapshot)
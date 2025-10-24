# Options Alerts


First thing i'm going to do is scrape blue horse shoe alerts per day.


Second thing i'm gonna do is put those alerts in something observable on my phone.


Third thing - i need a source of options data.  i forgot this is highly proprietary.


So step 3 - connect to some api and scrape data only for the options being predicted on by Blue HorseShoe.

Schwab is good, but alpaca is too 
https://docs.alpaca.markets/docs/getting-started


```angular2html
curl --request GET \
     --url 'https://data.alpaca.markets/v1beta1/options/quotes/latest?feed=opra' \
     --header 'accept: application/json'
```

Paper domain

```angular2html
curl -X GET \
    -H "APCA-API-KEY-ID: {YOUR_API_KEY_ID}"  
    -H "APCA-API-SECRET-KEY: {YOUR_API_SECRET_KEY}"  
    https://paper-api.alpaca.markets/v2/account
```

87904a47-6ff3-4316-95f5-42dfe1213e08


here's my estimated algorithm.
1. fetch the next day's estimated best trades.
create a web scraper to look at blue horseshoe posts and save the current ones. 

2. next day, fetch options quotes for them.
use alpaca api to fetch options quotes for that day. 
save the file as "{data}-{symbol}". append quotes to it. 

3. post the highest intra day trades to the alerts page.
look at quotes, compare to purchase. calculate profit. 
write to template page. this may require a database as it gets larger.

Bullinadvantage@aol.com

4. finally, add a cartoon character who can inspect and explain trades like the windows paperclip guy


options order
```angular2html
{
  "symbol": "AAPL240119C00190000",
  "qty": "1",
  "side": "buy",
  "type": "market",
  "time_in_force": "day"
}
```

real time options quotes
https://alpaca.markets/sdks/python/market_data.html

option format
```angular2html
{"message":"code=400, message=code=400, message=invalid symbol: \"HON\" does not match ^[A-Z]{1,5}\\d{6,7}[CP]\\d{8}$"}
```

[UNDERLYING][YYMMDD][C/P][strike*1000 zero-padded to 8 digits]


example gold
```angular2html
multisymbol_request_params = StockLatestQuoteRequest(symbol_or_symbols=["SPY", "GLD", "TLT"])

latest_multisymbol_quotes = stock_client.get_stock_latest_quote(multisymbol_request_params)

gld_latest_ask_price = latest_multisymbol_quotes["GLD"].ask_price

print(gld_latest_ask_price)

```

Tomorrow what do i work on.

put in order at market open of previous day's fresh trades.

run loop, fetch quotes. also post the price when profit was highest to the site.

example, post 1
TESLA, WEEKLY CALL, 



# Calculating options profit
example: TSLA251024P00422500'

profit if stock goes down. 
if i sell the put, profit (sale price - buyback price) x 100 - commissions
if i buy the put, profit (sale price - purchase price) x 100 - commissions

what is bid vs ask? 
bid = what you could sell for
ask = what you can buy for

entry price - what you bought at the ask, 
commissions - usually zero

time to expiration - affects longer holds
implied volatility - IV affects extrinsic time value. spike in IV affects option price.

so example calculation, i bought at the ask price of $0.47 the 422.5 TESLA Put

looks like you only get snapshots from here

https://forum.alpaca.markets/t/0dte-options-greeks/14697/2

so i guess the greeks won't be calculated by alpaca when it's 0dte because T is the denominator of black scholes.

snapshot vs option chain, option chain i probably want instead.

option chain = MASSIVE file. PROBABLY NEED a filter.









from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from alpaca.data import OptionHistoricalDataClient
from alpaca.data.requests import OptionSnapshotRequest
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import LimitOrderRequest, MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce, AssetClass
import config
from models import db, OptionsSnapshot, FreshPlay
import os
import json
import re
from datetime import datetime
from decimal import Decimal

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///options_snapshots.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

# Initialize Alpaca clients
option_client = OptionHistoricalDataClient(
    api_key=config.api_key,
    secret_key=config.api_secret
)

# Initialize Trading client for paper trading
trading_client = TradingClient(
    api_key=config.api_key,
    secret_key=config.api_secret,
    paper=True  # Use paper trading
)

# Create tables
with app.app_context():
    db.create_all()

@app.route("/")
def index():
    alerts = []
    return render_template("index.html", alerts=alerts)

@app.route("/about")
def about():
    return render_template("alerts.html")

@app.route("/api/fetch-options-snapshot", methods=["GET"])
def fetch_options_snapshot():
    """
    Fetch options snapshot for a given OCC symbol
    Query param: symbol (e.g., TSLA251024P00422500)
    """
    symbol = request.args.get("symbol")

    if not symbol:
        return jsonify({"error": "Missing 'symbol' parameter"}), 400

    try:
        snapshot_request = OptionSnapshotRequest(symbol_or_symbols=symbol)
        snapshot = option_client.get_option_snapshot(snapshot_request)

        # Convert snapshot to dict for JSON serialization
        snapshot_data = {}
        for key, value in snapshot.items():
            if hasattr(value, 'dict'):
                snapshot_data[key] = value.dict()
            elif hasattr(value, '__dict__'):
                snapshot_data[key] = {k: str(v) for k, v in value.__dict__.items()}
            else:
                snapshot_data[key] = str(value)

        return jsonify({
            "success": True,
            "symbol": symbol,
            "data": snapshot_data
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/save-snapshot", methods=["POST"])
def save_snapshot():
    """
    Save an options snapshot to the database
    Expects JSON body with 'symbol' and 'snapshot_data'
    """
    data = request.get_json()

    if not data or 'symbol' not in data or 'snapshot_data' not in data:
        return jsonify({"error": "Missing 'symbol' or 'snapshot_data' in request body"}), 400

    try:
        symbol = data['symbol']
        snapshot_data = data['snapshot_data']

        # Create new snapshot record
        new_snapshot = OptionsSnapshot.from_alpaca_snapshot(symbol, snapshot_data)
        db.session.add(new_snapshot)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Snapshot saved successfully",
            "id": new_snapshot.id,
            "symbol": symbol
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/snapshots", methods=["GET"])
def get_snapshots():
    """
    Retrieve options snapshots from the database
    Query params:
    - symbol: filter by OCC symbol (optional)
    - limit: number of records to return (default: 100)
    - offset: number of records to skip (default: 0)
    """
    symbol = request.args.get("symbol")
    limit = request.args.get("limit", 100, type=int)
    offset = request.args.get("offset", 0, type=int)

    try:
        query = OptionsSnapshot.query

        # Filter by symbol if provided
        if symbol:
            query = query.filter_by(symbol=symbol)

        # Order by most recent first
        query = query.order_by(OptionsSnapshot.created_at.desc())

        # Apply pagination
        snapshots = query.limit(limit).offset(offset).all()

        return jsonify({
            "success": True,
            "count": len(snapshots),
            "data": [snapshot.to_dict() for snapshot in snapshots]
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/snapshot/<int:snapshot_id>", methods=["GET"])
def get_snapshot_by_id(snapshot_id):
    """
    Retrieve a specific snapshot by ID
    """
    try:
        snapshot = OptionsSnapshot.query.get(snapshot_id)

        if not snapshot:
            return jsonify({
                "success": False,
                "error": "Snapshot not found"
            }), 404

        return jsonify({
            "success": True,
            "data": snapshot.to_dict()
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/fresh-plays/load", methods=["POST"])
def load_fresh_plays():
    """
    Load fresh plays from a file into the database
    Expects JSON body with 'date' (format: MM-DD-YYYY)
    Or load all files if no date specified
    """
    data = request.get_json()

    try:
        # Determine which files to load
        positions_dir = os.path.join(os.path.dirname(__file__), 'utils', 'positions')

        if data and 'date' in data:
            # Load specific date
            date_str = data['date']
            filename = f"Fresh_Plays_{date_str}.txt"
            files_to_load = [os.path.join(positions_dir, filename)]
        else:
            # Load all files
            files_to_load = [
                os.path.join(positions_dir, f)
                for f in os.listdir(positions_dir)
                if f.startswith('Fresh_Plays_') and f.endswith('.txt')
            ]

        loaded_count = 0

        for filepath in files_to_load:
            if not os.path.exists(filepath):
                continue

            # Extract date from filename
            filename = os.path.basename(filepath)
            date_match = re.search(r'Fresh_Plays_(\d{2}-\d{2}-\d{4})\.txt', filename)
            if not date_match:
                continue

            date_str = date_match.group(1)
            play_date = datetime.strptime(date_str, '%m-%d-%Y').date()

            # Read and parse the file
            with open(filepath, 'r') as f:
                plays = json.load(f)

            # Add each play to database (check for duplicates)
            for play in plays:
                # Check if this exact play already exists
                existing = FreshPlay.query.filter_by(
                    symbol=play['symbol'],
                    price=play['price'],
                    type=play['type'],
                    play_date=play_date
                ).first()

                if not existing:
                    new_play = FreshPlay(
                        symbol=play['symbol'],
                        price=play['price'],
                        expiration=play['expiration'],
                        type=play['type'],
                        play_date=play_date
                    )
                    db.session.add(new_play)
                    loaded_count += 1

        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Loaded {loaded_count} fresh plays",
            "count": loaded_count
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/fresh-plays", methods=["GET"])
def get_fresh_plays():
    """
    Get fresh plays from database
    Query params:
    - symbol: filter by symbol (optional)
    - type: filter by type (calls/puts) (optional)
    - date: filter by date MM-DD-YYYY (optional)
    - limit: number of records (default: 100)
    - offset: skip records (default: 0)
    """
    symbol = request.args.get("symbol")
    play_type = request.args.get("type")
    date_str = request.args.get("date")
    limit = request.args.get("limit", 100, type=int)
    offset = request.args.get("offset", 0, type=int)

    try:
        query = FreshPlay.query

        # Apply filters
        if symbol:
            query = query.filter_by(symbol=symbol.upper())
        if play_type:
            query = query.filter_by(type=play_type.lower())
        if date_str:
            play_date = datetime.strptime(date_str, '%m-%d-%Y').date()
            query = query.filter_by(play_date=play_date)

        # Order by most recent first
        query = query.order_by(FreshPlay.play_date.desc(), FreshPlay.created_at.desc())

        # Apply pagination
        plays = query.limit(limit).offset(offset).all()

        return jsonify({
            "success": True,
            "count": len(plays),
            "data": [play.to_dict() for play in plays]
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/fresh-plays/<int:play_id>", methods=["GET"])
def get_fresh_play_by_id(play_id):
    """
    Get a specific fresh play by ID
    """
    try:
        play = FreshPlay.query.get(play_id)

        if not play:
            return jsonify({
                "success": False,
                "error": "Fresh play not found"
            }), 404

        return jsonify({
            "success": True,
            "data": play.to_dict()
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/fresh-plays/create", methods=["POST"])
def create_fresh_play():
    """
    Create a fresh play from an OCC symbol
    Expects JSON body with:
    - symbol: Ticker symbol (e.g., BMNR)
    - price: Strike price (e.g., 50.00)
    - expiration: Expiration date in MM/DD format (e.g., 11/14)
    - type: Option type (e.g., calls or puts)
    - play_date: Date the play was created (YYYY-MM-DD)
    """
    data = request.get_json()

    if not data or not all(k in data for k in ['symbol', 'price', 'expiration', 'type', 'play_date']):
        return jsonify({
            "success": False,
            "error": "Missing required fields: symbol, price, expiration, type, play_date"
        }), 400

    try:
        from datetime import datetime

        # Parse play_date
        play_date = datetime.strptime(data['play_date'], '%Y-%m-%d').date()

        # Check if this exact play already exists
        existing = FreshPlay.query.filter_by(
            symbol=data['symbol'],
            price=float(data['price']),
            expiration=data['expiration'],
            type=data['type'],
            play_date=play_date
        ).first()

        if existing:
            return jsonify({
                "success": True,
                "message": "Play already exists",
                "data": existing.to_dict()
            })

        # Create new play
        new_play = FreshPlay(
            symbol=data['symbol'],
            price=float(data['price']),
            expiration=data['expiration'],
            type=data['type'],
            play_date=play_date
        )

        db.session.add(new_play)
        db.session.commit()

        print(f"[CREATE PLAY] Created fresh play: {new_play.symbol} ${new_play.price} {new_play.type} - ID: {new_play.id}")

        return jsonify({
            "success": True,
            "message": "Fresh play created successfully",
            "data": new_play.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        print(f"[CREATE PLAY] Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/positions", methods=["GET"])
def get_positions():
    """
    Get all current positions from Alpaca paper trading account
    """
    try:
        # Get all positions from Alpaca
        positions = trading_client.get_all_positions()

        # Convert positions to list of dicts for JSON serialization
        positions_list = []
        for position in positions:
            position_dict = {
                "symbol": position.symbol,
                "qty": str(position.qty),
                "side": position.side.value if hasattr(position.side, 'value') else str(position.side),
                "market_value": str(position.market_value) if position.market_value else "0",
                "cost_basis": str(position.cost_basis) if position.cost_basis else "0",
                "unrealized_pl": str(position.unrealized_pl) if position.unrealized_pl else "0",
                "unrealized_plpc": str(position.unrealized_plpc) if position.unrealized_plpc else "0",
                "current_price": str(position.current_price) if position.current_price else "0",
                "avg_entry_price": str(position.avg_entry_price) if position.avg_entry_price else "0",
                "asset_class": position.asset_class.value if hasattr(position.asset_class, 'value') else str(position.asset_class),
            }
            positions_list.append(position_dict)

        return jsonify({
            "success": True,
            "count": len(positions_list),
            "positions": positions_list
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to fetch positions: {str(e)}"
        }), 500

@app.route("/api/account", methods=["GET"])
def get_account():
    """
    Get account information from Alpaca paper trading account
    """
    try:
        # Get account information from Alpaca
        account = trading_client.get_account()

        # Convert account to dict for JSON serialization
        account_dict = {
            "cash": str(account.cash) if account.cash else "0",
            "portfolio_value": str(account.portfolio_value) if account.portfolio_value else "0",
            "buying_power": str(account.buying_power) if account.buying_power else "0",
            "equity": str(account.equity) if account.equity else "0",
            "last_equity": str(account.last_equity) if account.last_equity else "0",
        }

        return jsonify({
            "success": True,
            "account": account_dict
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to fetch account: {str(e)}"
        }), 500

@app.route("/api/historical-bars/<symbol>", methods=["GET"])
def get_historical_bars(symbol):
    """
    Get historical bars data for an options symbol
    """
    try:
        # Look for the most recent file for this symbol
        historical_bars_dir = os.path.join(os.path.dirname(__file__), 'historical_bars')

        if not os.path.exists(historical_bars_dir):
            return jsonify({
                "success": False,
                "error": "Historical bars directory not found"
            }), 404

        # Find files matching this symbol
        matching_files = [f for f in os.listdir(historical_bars_dir) if f.startswith(symbol)]

        if not matching_files:
            return jsonify({
                "success": False,
                "error": f"No historical data found for {symbol}"
            }), 404

        # Get the most recent file (sorted by date in filename)
        matching_files.sort(reverse=True)
        file_path = os.path.join(historical_bars_dir, matching_files[0])

        # Read and return the JSON data
        with open(file_path, 'r') as f:
            data = json.load(f)

        return jsonify({
            "success": True,
            "data": data
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to fetch historical bars: {str(e)}"
        }), 500

@app.route("/api/download-historical-bars/<symbol>", methods=["GET"])
def download_historical_bars(symbol):
    """
    Download and return historical bars data for an options symbol
    Uses Alpaca API to fetch real-time intraday data and saves it to a file

    Query parameters:
    - time_range: Optional time range ('1D', '1W', '1M', '3M', '1Y', 'ALL')
                  Default: '1D' (current day only)
    - play_date: Optional play creation date (YYYY-MM-DD)
    - expiration: Optional expiration (MM/DD or "weekly")
    """
    try:
        from download_historical import fetch_option_bars
        from datetime import datetime, timezone, timedelta
        from alpaca.data.timeframe import TimeFrame, TimeFrameUnit

        print(f"\n[API] Received request for symbol: {symbol}")

        # Get parameters
        time_range = request.args.get('time_range', '1D').upper()
        play_date_str = request.args.get('play_date')
        expiration_str = request.args.get('expiration')

        print(f"[API] Time range requested: {time_range}")
        print(f"[API] Play date: {play_date_str}")
        print(f"[API] Expiration: {expiration_str}")

        # Get the current date and time
        now = datetime.now(timezone.utc)
        today = now.date()

        print(f"[API] Current time (UTC): {now}")
        print(f"[API] Today's date: {today}")

        # Parse play_date if provided
        if play_date_str:
            # Parse in local timezone to avoid UTC offset issues
            play_date_parts = play_date_str.split('-')
            play_year = int(play_date_parts[0])
            play_month = int(play_date_parts[1])
            play_day = int(play_date_parts[2])
            play_date = datetime(play_year, play_month, play_day).date()
        else:
            play_date = today

        print(f"[API] Using play_date: {play_date}")

        # Calculate expiration date
        expiration_date = None
        if expiration_str:
            if expiration_str.lower() == 'weekly':
                # Calculate next Friday from play_date
                # "Weekly" means expires on the Friday of the same week
                play_datetime = datetime(play_date.year, play_date.month, play_date.day)
                day_of_week = play_datetime.weekday()  # 0 = Monday, 4 = Friday

                # Calculate days until Friday
                if day_of_week <= 4:
                    # Monday-Friday: expire on the upcoming Friday (or same day if Friday)
                    days_until_friday = 4 - day_of_week
                else:
                    # Saturday-Sunday: expire on next Friday
                    days_until_friday = 7 - day_of_week + 4

                expiration_datetime = play_datetime + timedelta(days=days_until_friday)
                expiration_date = expiration_datetime.date()
                print(f"[API] Weekly expiration - play_date: {play_date}, day_of_week: {day_of_week}, days_until_friday: {days_until_friday}, expiration: {expiration_date}")
            else:
                # Parse MM/DD format
                exp_parts = expiration_str.split('/')
                exp_month = int(exp_parts[0])
                exp_day = int(exp_parts[1])

                # Determine year
                exp_year = play_date.year
                if exp_month < play_date.month or (exp_month == play_date.month and exp_day < play_date.day):
                    exp_year = play_date.year + 1

                expiration_date = datetime(exp_year, exp_month, exp_day).date()

        print(f"[API] Calculated expiration_date: {expiration_date}")

        # Calculate start_time and timeframe based on time_range
        # For historical plays, use play_date as reference; for current plays, use now
        is_historical = play_date < today

        # Determine end_time
        if is_historical and expiration_date:
            # For historical plays, end at market close on expiration date (4 PM ET = 20:00 UTC)
            end_time = datetime(expiration_date.year, expiration_date.month, expiration_date.day, 20, 0, tzinfo=timezone.utc)
            print(f"[API] Historical play - end_time set to expiration: {end_time}")
        else:
            # For current plays, end at now minus 15 minutes (Alpaca delay)
            end_time = now - timedelta(minutes=15)
            print(f"[API] Current play - end_time set to now minus 15 min: {end_time}")

        # Calculate start_time based on time_range
        # For historical plays, use play_date as reference
        # For current plays, use today/now as reference
        reference_date = play_date if is_historical else today

        if time_range == '1D':
            # Beginning of reference date - use 1 minute bars
            start_time = datetime(reference_date.year, reference_date.month, reference_date.day, 13, 30, tzinfo=timezone.utc)  # 9:30 AM ET
            # For 1D on historical plays, end at market close of same day
            if is_historical:
                single_day_end = datetime(reference_date.year, reference_date.month, reference_date.day, 20, 0, tzinfo=timezone.utc)  # 4 PM ET
                end_time = single_day_end
            timeframe = TimeFrame.Minute
        elif time_range == '1W':
            # From reference date or 1 week back - use 30 minute bars
            if is_historical:
                start_time = datetime(play_date.year, play_date.month, play_date.day, 13, 30, tzinfo=timezone.utc)
            else:
                start_time = now - timedelta(weeks=1)
            timeframe = TimeFrame(30, TimeFrameUnit.Minute)
        elif time_range == '1M':
            # From reference date or 1 month back - use 1 hour bars
            if is_historical:
                start_time = datetime(play_date.year, play_date.month, play_date.day, 13, 30, tzinfo=timezone.utc)
            else:
                start_time = now - timedelta(days=30)
            timeframe = TimeFrame.Hour
        elif time_range == '3M':
            # From reference date or 3 months back - use 1 hour bars
            if is_historical:
                start_time = datetime(play_date.year, play_date.month, play_date.day, 13, 30, tzinfo=timezone.utc)
            else:
                start_time = now - timedelta(days=90)
            timeframe = TimeFrame.Hour
        elif time_range == '1Y':
            # From reference date or 1 year back - use 1 day bars
            if is_historical:
                start_time = datetime(play_date.year, play_date.month, play_date.day, 13, 30, tzinfo=timezone.utc)
            else:
                start_time = now - timedelta(days=365)
            timeframe = TimeFrame.Day
        else:
            # Invalid time range, default to 1D
            print(f"[API] Invalid time range '{time_range}', defaulting to 1D")
            start_time = datetime(reference_date.year, reference_date.month, reference_date.day, 13, 30, tzinfo=timezone.utc)
            if is_historical:
                end_time = datetime(reference_date.year, reference_date.month, reference_date.day, 20, 0, tzinfo=timezone.utc)
            timeframe = TimeFrame.Minute

        print(f"[API] Time range: {start_time} to {end_time}")
        print(f"[API] Timeframe: {timeframe}")
        print(f"[API] Is historical play: {is_historical}")

        # Fetch the bars data
        bars = fetch_option_bars(symbol, start_time, end_time, save_to_file=True, timeframe=timeframe)

        print(f"[API] Bars returned: {bars}")
        print(f"[API] Number of bars: {len(bars) if bars else 0}")

        if not bars:
            print(f"[API] ERROR: No bars data for {symbol}")
            return jsonify({
                "success": False,
                "body": f"{bars}",
                "error": f"No data available for {symbol} in the specified time range"
            }), 404

        # Convert bars to JSON-serializable format
        bars_data = []
        for bar in bars:
            bars_data.append({
                'timestamp': bar.timestamp.isoformat(),
                'open': bar.open,
                'high': bar.high,
                'low': bar.low,
                'close': bar.close,
                'volume': bar.volume,
                'trade_count': bar.trade_count if hasattr(bar, 'trade_count') else None,
                'vwap': bar.vwap if hasattr(bar, 'vwap') else None,
                'symbol': symbol
            })

        print(f"[API] Successfully converted {len(bars_data)} bars to JSON")

        return jsonify({
            "success": True,
            "data": {
                'symbol': symbol,
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'bar_count': len(bars_data),
                'bars': bars_data,
                'time_range': time_range
            }
        })

    except Exception as e:
        print(f"[API] EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to download historical bars: {str(e)}"
        }), 500

@app.route("/api/options/contract-details", methods=["GET"])
def get_contract_details():
    """
    Get contract details from Alpaca for a specific OCC symbol
    Query params:
    - occ_symbol: The OCC symbol (e.g., TSLA251024C00250000)
    """
    occ_symbol = request.args.get("occ_symbol")

    if not occ_symbol:
        return jsonify({
            "success": False,
            "error": "Missing 'occ_symbol' parameter"
        }), 400

    try:
        # Use the trading client to get contract details
        # The trading client has access to contract information
        import requests

        # Build the API URL
        url = f"https://paper-api.alpaca.markets/v2/options/contracts/{occ_symbol}"

        headers = {
            "APCA-API-KEY-ID": config.api_key,
            "APCA-API-SECRET-KEY": config.api_secret
        }

        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            contract_data = response.json()
            return jsonify({
                "success": True,
                "contract": contract_data
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to fetch contract: {response.text}"
            }), response.status_code

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to fetch contract details: {str(e)}"
        }), 500

@app.route("/api/close-position", methods=["POST"])
def close_position():
    """
    Close/sell a position using Alpaca trading API
    Expects JSON body with:
    - symbol: The symbol to close (e.g., GOOG251031C00295000)
    """
    data = request.get_json()

    if not data or 'symbol' not in data:
        return jsonify({
            "success": False,
            "error": "Missing required field: 'symbol'"
        }), 400

    try:
        symbol = data['symbol']

        print(f"[CLOSE POSITION] Closing position for symbol: {symbol}")

        # Close the position using Alpaca's close_position method
        result = trading_client.close_position(symbol)

        print(f"[CLOSE POSITION] Successfully closed position: {symbol}")
        print(f"[CLOSE POSITION] Result: {result}")

        # Convert result to dict for JSON serialization
        result_dict = {
            "symbol": symbol,
            "status": "closed"
        }

        if hasattr(result, '__dict__'):
            result_dict.update({k: str(v) for k, v in result.__dict__.items() if not k.startswith('_')})

        return jsonify({
            "success": True,
            "message": f"Successfully closed position for {symbol}",
            "result": result_dict
        })

    except Exception as e:
        print(f"[CLOSE POSITION] Error closing position: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Failed to close position: {str(e)}"
        }), 500

@app.route("/api/submit-order", methods=["POST"])
def submit_order():
    """
    Submit an options order to Alpaca paper trading
    Expects JSON body with:
    - occ_symbol: The OCC symbol (e.g., TSLA251024C00250000)
    - quantity: Number of contracts
    - order_type: 'market' or 'limit' (optional, default: market)
    - limit_price: Limit price if order_type is 'limit' (optional)
    - side: 'buy' or 'sell' (optional, default: buy)
    """
    data = request.get_json()

    if not data or 'occ_symbol' not in data or 'quantity' not in data:
        return jsonify({
            "success": False,
            "error": "Missing required fields: 'occ_symbol' and 'quantity'"
        }), 400

    try:
        occ_symbol = data['occ_symbol']
        quantity = int(data['quantity'])
        order_type = data.get('order_type', 'market').lower()
        limit_price = data.get('limit_price')
        side = data.get('side', 'buy').lower()

        # Validate inputs
        if quantity <= 0:
            return jsonify({
                "success": False,
                "error": "Quantity must be greater than 0"
            }), 400

        if side not in ['buy', 'sell']:
            return jsonify({
                "success": False,
                "error": "Side must be 'buy' or 'sell'"
            }), 400

        # Determine order side
        order_side = OrderSide.BUY if side == 'buy' else OrderSide.SELL

        # Create order request based on type
        if order_type == 'limit':
            if not limit_price:
                return jsonify({
                    "success": False,
                    "error": "Limit price is required for limit orders"
                }), 400

            order_data = LimitOrderRequest(
                symbol=occ_symbol,
                qty=quantity,
                side=order_side,
                time_in_force=TimeInForce.DAY,
                limit_price=float(limit_price)
            )
        else:  # market order
            order_data = MarketOrderRequest(
                symbol=occ_symbol,
                qty=quantity,
                side=order_side,
                time_in_force=TimeInForce.DAY
            )

        # Submit the order to Alpaca
        order = trading_client.submit_order(order_data)

        # Convert order response to dict for JSON serialization
        order_dict = {
            "id": str(order.id),
            "symbol": order.symbol,
            "qty": str(order.qty),
            "side": order.side.value,
            "type": order.type.value,
            "time_in_force": order.time_in_force.value,
            "status": order.status.value,
            "created_at": str(order.created_at),
            "filled_avg_price": str(order.filled_avg_price) if order.filled_avg_price else None,
            "filled_qty": str(order.filled_qty) if order.filled_qty else "0",
        }

        if hasattr(order, 'limit_price') and order.limit_price:
            order_dict["limit_price"] = str(order.limit_price)

        return jsonify({
            "success": True,
            "message": f"Order submitted successfully to Alpaca paper trading",
            "order": order_dict
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to submit order: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

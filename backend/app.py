from flask import Flask, render_template, request, jsonify
from alpaca.data import OptionHistoricalDataClient
from alpaca.data.requests import OptionSnapshotRequest
import config
from models import db, OptionsSnapshot
import os

app = Flask(__name__)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///options_snapshots.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

# Initialize Alpaca client
option_client = OptionHistoricalDataClient(
    api_key=config.api_key,
    secret_key=config.api_secret
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

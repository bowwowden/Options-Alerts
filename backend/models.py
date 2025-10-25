from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from dateutil import parser as date_parser

db = SQLAlchemy()

class OptionsSnapshot(db.Model):
    __tablename__ = 'options_snapshots'

    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(50), nullable=False, index=True)

    # Greeks
    greeks = db.Column(db.JSON, nullable=True)
    implied_volatility = db.Column(db.Float, nullable=True)

    # Latest Quote fields
    ask_exchange = db.Column(db.String(10), nullable=True)
    ask_price = db.Column(db.Float, nullable=True)
    ask_size = db.Column(db.Float, nullable=True)
    bid_exchange = db.Column(db.String(10), nullable=True)
    bid_price = db.Column(db.Float, nullable=True)
    bid_size = db.Column(db.Float, nullable=True)
    quote_conditions = db.Column(db.String(20), nullable=True)
    quote_tape = db.Column(db.String(10), nullable=True)
    quote_timestamp = db.Column(db.DateTime, nullable=True)

    # Latest Trade fields
    trade_conditions = db.Column(db.String(20), nullable=True)
    trade_exchange = db.Column(db.String(10), nullable=True)
    trade_id = db.Column(db.String(50), nullable=True)
    trade_price = db.Column(db.Float, nullable=True)
    trade_size = db.Column(db.Float, nullable=True)
    trade_tape = db.Column(db.String(10), nullable=True)
    trade_timestamp = db.Column(db.DateTime, nullable=True)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<OptionsSnapshot {self.symbol} @ {self.quote_timestamp}>'

    def to_dict(self):
        """Convert to dictionary format similar to Alpaca response"""
        return {
            'id': self.id,
            'symbol': self.symbol,
            'greeks': self.greeks,
            'implied_volatility': self.implied_volatility,
            'latest_quote': {
                'ask_exchange': self.ask_exchange,
                'ask_price': self.ask_price,
                'ask_size': self.ask_size,
                'bid_exchange': self.bid_exchange,
                'bid_price': self.bid_price,
                'bid_size': self.bid_size,
                'conditions': self.quote_conditions,
                'symbol': self.symbol,
                'tape': self.quote_tape,
                'timestamp': self.quote_timestamp.isoformat() if self.quote_timestamp else None
            },
            'latest_trade': {
                'conditions': self.trade_conditions,
                'exchange': self.trade_exchange,
                'id': self.trade_id,
                'price': self.trade_price,
                'size': self.trade_size,
                'tape': self.trade_tape,
                'timestamp': self.trade_timestamp.isoformat() if self.trade_timestamp else None
            } if self.trade_price is not None else None,
            'created_at': self.created_at.isoformat()
        }

    @classmethod
    def from_alpaca_snapshot(cls, symbol, snapshot_data):
        """Create OptionsSnapshot from Alpaca API response"""
        latest_quote = snapshot_data.get('latest_quote', {})
        latest_trade = snapshot_data.get('latest_trade', {})

        # Helper function to parse timestamp
        def parse_timestamp(ts):
            if ts is None:
                return None
            if isinstance(ts, datetime):
                return ts
            if isinstance(ts, str):
                return date_parser.parse(ts)
            return None

        return cls(
            symbol=symbol,
            greeks=snapshot_data.get('greeks'),
            implied_volatility=snapshot_data.get('implied_volatility'),
            # Quote data
            ask_exchange=latest_quote.get('ask_exchange'),
            ask_price=latest_quote.get('ask_price'),
            ask_size=latest_quote.get('ask_size'),
            bid_exchange=latest_quote.get('bid_exchange'),
            bid_price=latest_quote.get('bid_price'),
            bid_size=latest_quote.get('bid_size'),
            quote_conditions=latest_quote.get('conditions'),
            quote_tape=latest_quote.get('tape'),
            quote_timestamp=parse_timestamp(latest_quote.get('timestamp')),
            # Trade data
            trade_conditions=latest_trade.get('conditions'),
            trade_exchange=latest_trade.get('exchange'),
            trade_id=latest_trade.get('id'),
            trade_price=latest_trade.get('price'),
            trade_size=latest_trade.get('size'),
            trade_tape=latest_trade.get('tape'),
            trade_timestamp=parse_timestamp(latest_trade.get('timestamp'))
        )
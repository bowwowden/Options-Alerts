#!/usr/bin/env python3
"""
Load today's fresh plays into the database
"""

import json
import os
from datetime import datetime
from app import app
from models import db, FreshPlay

def load_fresh_plays_from_file(date_str):
    """
    Load fresh plays from a specific date into the database

    Args:
        date_str: Date string in format MM-DD-YYYY
    """
    file_path = f"utils/positions/Fresh_Plays_{date_str}.txt"

    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return 0

    # Parse date
    play_date = datetime.strptime(date_str, "%m-%d-%Y").date()

    # Load the JSON data
    with open(file_path, 'r') as f:
        plays_data = json.load(f)

    print(f"\n{'=' * 60}")
    print(f"Loading Fresh Plays from {date_str}")
    print(f"{'=' * 60}")
    print(f"File: {file_path}")
    print(f"Records in file: {len(plays_data)}")

    loaded_count = 0
    skipped_count = 0

    for play in plays_data:
        # Check if this play already exists
        existing = FreshPlay.query.filter_by(
            symbol=play['symbol'],
            price=play['price'],
            type=play['type'],
            expiration=play['expiration'],
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
            print(f"  ✓ Added: {play['symbol']} ${play['price']} {play['type']} exp:{play['expiration']}")
        else:
            skipped_count += 1
            print(f"  - Skipped (exists): {play['symbol']} ${play['price']} {play['type']}")

    db.session.commit()

    print(f"\n{'=' * 60}")
    print(f"✓ Successfully loaded {loaded_count} new fresh plays")
    print(f"  Skipped {skipped_count} duplicates")
    print(f"{'=' * 60}\n")

    return loaded_count

if __name__ == "__main__":
    with app.app_context():
        # Load today's fresh plays
        today = datetime.now().strftime("%m-%d-%Y")
        print(f"Today's date: {today}")

        loaded = load_fresh_plays_from_file(today)

        if loaded > 0:
            # Show updated total
            total = FreshPlay.query.count()
            print(f"Total fresh plays in database: {total}")
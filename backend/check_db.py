#!/usr/bin/env python3
"""
Debug script to check what's in the FreshPlay database
"""

from app import app
from models import db, FreshPlay

with app.app_context():
    # Get all fresh plays
    fresh_plays = FreshPlay.query.all()

    print(f"=" * 60)
    print(f"Database Check: FreshPlay Table")
    print(f"=" * 60)
    print(f"\nTotal records: {len(fresh_plays)}")

    if not fresh_plays:
        print("\n⚠️  Database is EMPTY!")
        print("\nTo populate the database, you should:")
        print("1. Run scrape_scheduler.py to generate Fresh_Plays file")
        print("2. Run load_todays_fresh_plays.py to load into database")
    else:
        print("\n✓ Database has records!\n")

        # Show today's records
        from datetime import date
        today = date.today()
        todays_plays = [p for p in fresh_plays if p.play_date == today]

        if todays_plays:
            print(f"Today's Fresh Plays ({today}):")
            print("-" * 60)
            for i, play in enumerate(todays_plays, 1):
                print(f"{i}. {play.symbol:6} ${play.price:7.2f} {play.type:5} "
                      f"exp:{play.expiration:10}")
            print()

        print("All records:")
        print("-" * 60)

        for i, play in enumerate(fresh_plays, 1):
            print(f"{i:2}. {play.symbol:6} ${play.price:7.2f} {play.type:5} "
                  f"exp:{play.expiration:10} date:{play.play_date}")

    print("\n" + "=" * 60)
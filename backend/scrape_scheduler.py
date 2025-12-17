#!/usr/bin/env python3
"""
Daily Fresh Plays Scheduler

This script runs the complete daily workflow:
1. Scrape the latest article from the web
2. Extract options positions from the article
3. Load positions into the database

Usage:
    python3 scrape_scheduler.py
"""

import os
import re
import json
from datetime import datetime
from utils import scraper
import utils.order_reader as order_fetcher
from app import app
from models import db, FreshPlay


def get_latest_article():
    """Find the latest article file by date in utils/articles directory"""
    articles_dir = "utils/articles"

    if not os.path.exists(articles_dir):
        raise FileNotFoundError(f"Articles directory not found: {articles_dir}")

    # Get all .txt files in the directory
    article_files = [f for f in os.listdir(articles_dir) if f.endswith('.txt')]

    if not article_files:
        raise FileNotFoundError("No article files found")

    # Extract dates and find the latest
    latest_file = None
    latest_date = None

    for filename in article_files:
        # Extract date in format MM-DD-YYYY from filename
        match = re.search(r'(\d{2}-\d{2}-\d{4})\.txt$', filename)
        if match:
            date_str = match.group(1)
            try:
                file_date = datetime.strptime(date_str, "%m-%d-%Y")
                if latest_date is None or file_date > latest_date:
                    latest_date = file_date
                    latest_file = filename
            except ValueError:
                continue

    if latest_file is None:
        raise ValueError("Could not find any article files with valid dates")

    return os.path.join(articles_dir, latest_file)


def load_fresh_plays_to_db(date_str):
    """
    Load fresh plays from a specific date into the database

    Args:
        date_str: Date string in format MM-DD-YYYY

    Returns:
        Number of plays loaded
    """
    file_path = f"utils/positions/Fresh_Plays_{date_str}.txt"

    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return 0

    # Parse date
    play_date = datetime.strptime(date_str, "%m-%d-%Y").date()

    # Load the JSON data
    with open(file_path, 'r') as f:
        plays_data = json.load(f)

    print(f"\n{'=' * 60}")
    print(f"Loading Fresh Plays into Database")
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
            print(f"  + Added: {play['symbol']} ${play['price']} {play['type']} exp:{play['expiration']}")
        else:
            skipped_count += 1
            print(f"  - Skipped (exists): {play['symbol']} ${play['price']} {play['type']}")

    db.session.commit()

    print(f"\n{'=' * 60}")
    print(f"Loaded {loaded_count} new fresh plays")
    print(f"Skipped {skipped_count} duplicates")
    print(f"{'=' * 60}\n")

    return loaded_count


def run_daily_scrape():
    """
    Run the complete daily scraping workflow
    """
    print("\n" + "=" * 60)
    print("DAILY FRESH PLAYS SCRAPER")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Step 1: Scrape article from web
    print("\n[Step 1/3] Scraping latest article...")
    try:
        scraper.scrape_article()
        print("Article scraped successfully!")
    except Exception as e:
        print(f"Error scraping article: {e}")
        return

    # Step 2: Find and extract positions from the article
    print("\n[Step 2/3] Extracting options positions...")
    try:
        latest_article = get_latest_article()
        print(f"Latest article: {latest_article}")

        data = scraper.write_fresh_plays_files(latest_article)
        print(f"Extracted {len(data)} positions:")
        for pos in data:
            print(f"  - {pos['symbol']} ${pos['price']} {pos['type']} ({pos['expiration']})")
    except Exception as e:
        print(f"Error extracting positions: {e}")
        return

    # Step 3: Load into database
    print("\n[Step 3/3] Loading into database...")
    today = datetime.now().strftime("%m-%d-%Y")

    with app.app_context():
        loaded = load_fresh_plays_to_db(today)

        if loaded > 0:
            total = FreshPlay.query.count()
            print(f"Total fresh plays in database: {total}")

    print("\n" + "=" * 60)
    print("DAILY SCRAPE COMPLETE")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run_daily_scrape()

import json
import os
from datetime import datetime, timedelta

def grab_yesterday_fresh_plays():
    # Well today this won't work so comment out
    # yesterday = datetime.now() - timedelta(days=1)
    # date_str = yesterday.strftime("%m-%d-%Y")

    date_str = datetime.now().strftime("%m-%d-%Y")
    file_path = os.path.join(os.path.dirname(__file__), "positions", f"Fresh_Plays_{date_str}.txt")

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    return json.loads(content)


# Is it weekly? Set expiration date this Friday.
# OCC Style options
def make_occ_symbol(option, expiration_date):
    symbol = option["symbol"]
    price = option["price"]
    option_type = option["type"]

    yy = expiration_date[2:4]
    mm = expiration_date[5:7]
    dd = expiration_date[8:10]

    strike_int = int(price * 1000)
    strike_str = str(strike_int).zfill(8)

    occ_symbol = f"{symbol}{yy}{mm}{dd}{option_type[0].upper()}{strike_str}"
    return occ_symbol


def get_weekly_expiration(today=None):
    """Return YYYY-MM-DD string for the Friday of the current week"""
    if today is None:
        today = datetime.now()

    # Weekday: Monday=0, Sunday=6
    weekday = today.weekday()
    # Days until Friday
    days_until_friday = 4 - weekday  # Friday=4
    if days_until_friday < 0:
        # Already past Friday? pick next week's Friday
        days_until_friday += 7

    friday = today + timedelta(days=days_until_friday)
    return friday.strftime("%Y-%m-%d")


def format_options_with_occ_symbol(fresh_plays):
    for option in fresh_plays:
        expiration_str = option["expiration"]

        if expiration_str == "weekly":
            # Get this week's Friday
            expiration_date = get_weekly_expiration()
        else:
            # Parse MM/DD format and convert to YYYY-MM-DD
            # Assume current year or next year if the date has passed
            try:
                month, day = expiration_str.split('/')
                current_year = datetime.now().year

                # Try current year first
                expiration_date = f"{current_year}-{month.zfill(2)}-{day.zfill(2)}"
                exp_datetime = datetime.strptime(expiration_date, "%Y-%m-%d")

                # If the date is in the past (compare dates only, not time), use next year
                if exp_datetime.date() < datetime.now().date():
                    expiration_date = f"{current_year + 1}-{month.zfill(2)}-{day.zfill(2)}"
            except (ValueError, AttributeError) as e:
                print(f"Warning: Could not parse expiration '{expiration_str}': {e}")
                continue

        option["occ_symbol"] = make_occ_symbol(option, expiration_date)

    # Only return options that have occ_symbol
    orders = [option["occ_symbol"] for option in fresh_plays if "occ_symbol" in option]

    return orders



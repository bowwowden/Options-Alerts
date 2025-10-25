# Time zone is eastern time. user always posts around 9am easter time, can be 15 min before or 5 min after.
# user only posts mon-friday.
# Check at 9am, if the post isn't there, wait 15 minutes.

import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
import json

URL: str = "https://bluehorseshoestocks.com/"
content = None

def scrape_article():
    response = requests.get(URL, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Get the first article
    article = soup.find("article")
    if not article:
        raise ValueError("No article found on page!")


    title = article.find("h2", class_="entry-title").get_text(strip=True)

    # 2️⃣ Get all paragraphs in the entry-content section
    content = article.find("div", class_="entry-content")

    now = datetime.now()

    date_str = now.strftime("%m-%d-%Y")

    safe_title = re.sub(r"[^\w\s-]", "", title)  # remove special chars
    safe_title = safe_title.replace(" ", "_")

    # 2️⃣ Combine with date
    filename = f"{safe_title}_{date_str}.txt"
    file_content = content.get_text()

    with open(f"utils/articles/{filename}", "w") as f:
        f.write(file_content)

# Ok, article saved.
# now save the fresh options symbols, prices.
# perhaps save it to positions/ as a reference.

def convert_fresh_options_to_json(fresh_lines):
    data = []

    for line in fresh_lines:
        # Extract symbol, type, price range
        # Pattern: SYMBOL Weekly $START-END Calls/Puts
        match = re.match(r"(\w+)\s+Weekly\s+\$?([\d.]+)-?([\d.]*)\s+(Calls|Puts)", line, re.IGNORECASE)
        if match:
            symbol, start_price, end_price, option_type = match.groups()
            expiration = "weekly"

            # Convert prices to float
            start_price = float(start_price)
            if end_price:
                end_price = float(end_price)
                prices = [start_price, end_price]
            else:
                prices = [start_price]

            # Generate one JSON object per price
            for price in prices:
                data.append({
                    "symbol": symbol.upper(),
                    "price": price,
                    "expiration": expiration,
                    "type": option_type.lower()
                })

    return data


def extract_options_positions(text):
    # 1️⃣ Find the section
    start_marker = "Fresh Options Ideas:"
    end_marker = "Extended Watchlist:"

    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)

    # 2️⃣ Extract the lines in between
    if start_idx != -1 and end_idx != -1:
        section = text[start_idx + len(start_marker):end_idx].strip()
        # 3️⃣ Split by lines and remove empty lines
        fresh_lines = [line.strip() for line in section.splitlines() if line.strip()]

    # # 4️⃣ Print results
    # for line in fresh_lines:
    #     print(line)

    data = convert_fresh_options_to_json(fresh_lines)
    return data


def write_fresh_plays_files(filename):
    content = open(filename).read()
    data = extract_options_positions(content)

    # print(data)
    # save the position
    now = datetime.now()

    date_str = now.strftime("%m-%d-%Y")

    # 2️⃣ Combine with date
    filename = f"Fresh_Plays_{date_str}.txt"

    with open(f"backend/utils/positions/{filename}", "w") as f:
        json.dump(data, f, indent=4)

    return data





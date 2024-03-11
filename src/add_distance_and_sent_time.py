import json
import time
from datetime import timedelta
from pathlib import Path
import argparse

from dateutil import parser
import pandas as pd
import numpy as np
import requests
from bs4 import BeautifulSoup

CSV_FILE_PATH = Path("reports.csv")

IS_REPORTS = True
if IS_REPORTS:
    filename = "reports"
    column_names = ['attacker', 'origin', 'target', 'arrival_time', 'sent_time', 'distance', 'speed', 'fake']
else:
    filename = "incomings"
    column_names = ['attacker', 'origin', 'target', 'arrival_time', 'sent_time', 'distance', 'speed']

def calculate_distance(origin, target):
    url = f"https://www.twstats.com/en133/ajax.php?mode=dcalc&o={origin}&t={target}"
    response = requests.get(url)
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        table = soup.find('table', attrs={'class': 'box'})
        distance_field = table.find('td').text
        return float(distance_field)
    else:
        print('Unable to fetch data, Unexpected Error')


if __name__ == '__main__':
    arg_parser = argparse.ArgumentParser(description='Gets distance and sent_time.')
    arg_parser.add_argument('--csv-file', type=str, default=CSV_FILE_PATH)

    reports = pd.read_csv(CSV_FILE_PATH)

    updated_reports = list()

    # Iterate through each report
    for index, report in reports.iterrows():
        print(f'Processing report {index + 1} / {len(reports)}')
        report["distance"] = calculate_distance(report['origin'], report['target'])
        arrival_time = parser.parse(report["arrival_time"])
        report["arrival_time"] = arrival_time.isoformat()
        journey_time_minutes = report["distance"] * int(report["speed"])
        report["sent_time"] = (arrival_time - timedelta(minutes=journey_time_minutes)).isoformat()
        updated_reports.append(report)
        time.sleep(0.1)

    updated_reports = pd.DataFrame(updated_reports)
    updated_reports = updated_reports.reindex(columns=column_names)
    updated_reports.to_csv(f"{filename}_{len(reports)}.csv", index=False)

import json
from datetime import timedelta
from pathlib import Path
import argparse

from dateutil import parser
import pandas as pd
import numpy as np
import requests
from bs4 import BeautifulSoup

CSV_FILE_PATH = Path("../data/reports/data.csv")

speeds = {
    "ram": 30,
    "axe": 18,
    "spy": 8,
    "light": 10,
    "heavy": 11,
    "sword": 22,
    "noble": 35
}


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
    parser = argparse.ArgumentParser(description='If missing distance or sent_time or arrival_time in the labeling of '
                                                 'the report, this script will try to add missing data.')
    parser.add_argument('--csv-file', type=str, default=CSV_FILE_PATH)

    reports = pd.read_csv(CSV_FILE_PATH,
                          names=["player", "origin", "target", "arrival_time", "sent_time", "speed", "distance",
                                 "fake"])

    updated_reports = list()

    # Iterate through each report
    for index, report in reports.iterrows():
        # Check if a value is nan and act depending on the column
        if report.isnull().any():
            # check arrival_time, sent_time and distance
            arrival_time = parser.parse(report["arrival_time"])
            report["arrival_time"] = arrival_time
            # distance first as we can use that to find arrival time
            if pd.isnull(report["distance"]):
                report["distance"] = calculate_distance(report["origin"], report["target"])

            # check that we have a sent_time
            travel_time_minutes = speeds[report["speed"]] * report["distance"]
            if pd.isnull(report["sent_time"]):
                report["sent_time"] = arrival_time - timedelta(minutes=travel_time_minutes)
            else:
                # we have a sent_time, so we can adjust the arrival_time to get a more precise time
                sent_time = parser.parse(report["sent_time"])
                if arrival_time.second == 0:
                    # it is likely this is inaccurate
                    report["arrival_time"] = sent_time + timedelta(minutes=travel_time_minutes)

                report["sent_time"] = sent_time

            for column in report.keys():
                if pd.isnull(report[column]):
                    print(index, column)

        updated_reports.append(report)

    updated_reports = pd.DataFrame(updated_reports)
    updated_reports.to_csv("reports_fixed.csv", index=False)

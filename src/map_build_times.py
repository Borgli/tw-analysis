
import json
from pathlib import Path

KNOWN_BUILD_LEVELS_PATH = Path("../data/known_build_times.json")

with open(KNOWN_BUILD_LEVELS_PATH, 'r') as f:
    known_build_levels = json.load(f)

print(known_build_levels)

hq_speed_factors = [
    0.95, 0.91, 0.86, 0.82, 0.78, 0.75, 0.71, 0.68, 0.64, 0.61,
    0.58, 0.56, 0.53, 0.51, 0.48, 0.46, 0.44, 0.42, 0.40, 0.38,
    0.36, 0.34, 0.33, 0.31, 0.30, 0.28, 0.27, 0.26, 0.24, 0.23
]

paladin_villages = [[150006, 0.03], [182828, 0.03], [189533, ]]


conflicts = []  # To store any discrepancies found
for building_name, building_levels in known_build_levels.items():
    for level, level_data in enumerate(building_levels):
        for hq_level, build_info in enumerate(level_data):
            if not build_info:  # Skip if build_info is empty
                continue

            if len(build_info) > 1:
                print(f"Found multiple entries for {building_name}/level {level}/hq {hq_level}:")
                for info in build_info:
                    print(f"{info[0]} : https://en133.tribalwars.net/game.php?village={info[3]}&screen=main | {info}")



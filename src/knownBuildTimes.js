
function getKnownBuildTimes(villages) {
  let knownBuildTimes = {
    'main': Array.from({length: 30}, () => Array.from({length: 30}, () => [])),
    'barracks': Array.from({length: 25}, () => Array.from({length: 30}, () => [])),
    'stable': Array.from({length: 20}, () => Array.from({length: 30}, () => [])),
    'garage': Array.from({length: 15}, () => Array.from({length: 30}, () => [])),
    'snob': Array.from({length: 3}, () => Array.from({length: 30}, () => [])),
    'smith': Array.from({length: 20}, () => Array.from({length: 30}, () => [])),
    'place': Array.from({length: 1}, () => Array.from({length: 30}, () => [])),
    'statue': Array.from({length: 1}, () => Array.from({length: 30}, () => [])),
    'market': Array.from({length: 25}, () => Array.from({length: 30}, () => [])),
    'wood': Array.from({length: 30}, () => Array.from({length: 30}, () => [])),
    'stone': Array.from({length: 30}, () => Array.from({length: 30}, () => [])),
    'iron': Array.from({length: 30}, () => Array.from({length: 30}, () => [])),
    'farm': Array.from({length: 30}, () => Array.from({length: 30}, () => [])),
    'storage': Array.from({length: 30}, () => Array.from({length: 30}, () => [])),
    'hide': Array.from({length: 10}, () => Array.from({length: 30}, () => [])),
    'wall': Array.from({length: 20}, () => Array.from({length: 30}, () => [])),
  };

  villages.forEach((village) => {
    let villageID = village['ID'];
    village = village['villageBuildings'];
    let HQLevel = village['main']['Building Current Level'];
    for (const [key, value] of Object.entries(village)) {
      let level;
      let buildTime;
      let buildingName;
      if (key === "villageBuildQueue") {
        village[key].forEach((building) => {
          buildingName = Object.keys(building)[0];
          level = building[buildingName]['Building Level'] - 1;
          buildTime = building[buildingName]['Building Time'];
        });
      } else {
        buildingName = key;
        level = village[buildingName]['Building Current Level'];
        buildTime = village[buildingName]['Building Time'];
      }
      if (buildTime && level < knownBuildTimes[buildingName].length) {
        if (!knownBuildTimes[buildingName][level][HQLevel - 1].some((item) => item[0] === buildTime)) {
          knownBuildTimes[buildingName][level][HQLevel - 1].push([buildTime, level, HQLevel, parseInt(villageID)]);
        }
      }
    }
  });

  return knownBuildTimes;
}

let villages = localStorage.getItem('villages_building_times');
villages = villages ? JSON.parse(villages) : [];
console.log(getKnownBuildTimes(villages));

/*
	* Scrape reports in csv format from the reports (defense) page: screen=report&mode=defense
*/

if (!(game_data.screen === 'overview_villages' && document.location.search.includes('mode=buildings'))) {
	UI.InfoMessage('Going to incomings overview ...', 3000, 'success');
	document.location = game_data.link_base_pure + 'overview_villages&mode=buildings';
	throw new Error("Wrong page");
} else {
	runScript();
}

function fixLocale(parsed_date) {
	let current_date = new Date();
	// datestr is in UTC, but date is in local, so we need to adjust for timezone
	parsed_date.setMinutes(parsed_date.getMinutes() - parsed_date.getTimezoneOffset());

	if (parsed_date < current_date) {
		parsed_date.setFullYear(current_date.getFullYear())
	}
	let dateString;
	// ISO-string prints it as UTC
	try {
		 dateString = parsed_date.toISOString().replace('Z', '000+00:00');
	} catch (e) {
		UI.promptErrorWithReloadOption("Report is not parseable. \nIt is likely that the bot protection is triggered.\nReload the page and try to run the script again.");
	}
    return dateString;
}

function findSpeed(attackers) {
	const speeds = {
		"spear": 18,
		"sword": 22,
		"axe": 18,
		"archer": 18,
		"spy": 9,
		"light": 10,
		"marcher": 10,
		"heavy": 11,
		"ram": 30,
		"catapult": 30,
		"knight": 10,
		"snob": 35
	};
	let activeAttackers = Object.values(speeds).filter((_, index) => attackers[index]);
	return activeAttackers.sort()[0];
}

function subtractMinutes(date, minutes) {
  const milliseconds = minutes * 60 * 1000;
  return new Date(date.getTime() - milliseconds);
}

function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function delay(time) {
	return new Promise(resolve => setTimeout(resolve, time));
}

UI.reloadPage = function() {
	window.location.reload(true);
};

UI.promptErrorWithReloadOption = function(errorMessage) {
	let buttons = [
		{
			text: "Reload", // The text displayed on the reload button
			callback: UI.reloadPage, // The function to call when the button is clicked
			confirm: true // Assuming this indicates a primary action button
		}
	];

	// Assuming the function signature of UI.ConfirmationBox is (message, buttons, id, hideOtherButtons, useAsModal)
	// You may need to adjust parameters based on the actual implementation details
	// The ID for this confirmation box could be something unique for the error prompt
	// 'false' for hiding other buttons, 'true' to act as a modal dialog, and the last 'true' to check for confirmation skipping
	UI.ConfirmationBox(errorMessage, buttons, "errorReloadPrompt", true, true, false);
	throw Error('Script needs to reload.');
};

function createCopyButtons(buttonText, textToCopy) {
	/* Add copy to clip board button */
	return  button = $('<button/>', {
    text: "Copy " + buttonText, // Button text
		class: 'btn',
		style: 'margin-left: 1px',
    click: function() { // Button click handler
      navigator.clipboard.writeText(textToCopy).then(function() {
        console.log('Copying to clipboard was successful!');
				UI.InfoMessage('Copied ' + buttonText + ' to clipboard.', 3000, 'success');
      }, function(err) {
        console.error('Could not copy text: ', err);
      });
    }
  });
}

async function getBuildingTimeForEachVillage(villages) {
	/* Add progress bar */
	$("#paged_view_content").prepend('<div id="infoBar" style="display: flex; align-items: center;">' +
		'Building times - Scraping:' +
		`<div style="margin-left: 10px; margin-right: 5px; width: 344px" class="progress-bar" id="progress-bar">\n` +
		'     <span class="label" style="width: 344px" id="progress"></span>\n' +
		`     <div style="width: 0%;"></div>\n` +
		'</div></div>');

	UI.InitProgressBars();

	const rows = $("#villages > tr").get();
	let numberOfRows = rows.length;

	const progressText = $('#progress-bar > div > span');
	$(progressText).html(`${$(progressText).html()} -> ~${(numberOfRows * 0.2).toFixed(0)} seconds left`);

	const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;
	let averageTime = [];
	let totalStartTime = performance.now(); let totalEndTime = 0;
	let startTime = 0; let endTime = 0;
	let rowNumber = 1;

	for (let i = 0; i < rows.length; i++) {
		let timeLeft = (averageTime.length > 0) ? ((numberOfRows - (rowNumber)) * average(averageTime)).toFixed(0) : ((numberOfRows - (rowNumber)) * 0.2).toFixed(0);
		console.log(`Processing ${rowNumber} of ${numberOfRows} | Time left: ${timeLeft} seconds`);
		UI.updateProgressBar($(".progress-bar"), rowNumber, numberOfRows);
		$("#progress").html(`${Format.number(rowNumber)} / ${Format.number(numberOfRows)} -> ~${timeLeft} seconds left`);
		$(progressText).html(`${$(progressText).html()} -> ~${timeLeft} seconds left`);
		rowNumber += 1;

		const row = rows[i];
		const villageID = $(row).find("td.nowrap > span").attr('data-id');
		if (villages.find((villages) => villageID === villages['ID'])) {
			continue;
		}

		console.log(villageID);
		console.log($(row).find("td.nowrap > span > span > a:nth-child(1)").attr('href'));
		console.log()

		startTime = performance.now();
		await new Promise(resolve => {
			$.get($(row).find("td.nowrap > span > span > a:nth-child(1)").attr('href'), (data) => {
				const $buildingPage = $(data);

				let villageBuildQueue = [];
				const buildQueue = $buildingPage.find('#buildqueue > tr.sortable_row').get();
				let buildingShortName;
				buildQueue.forEach((building) => {
					buildingShortName = $(building).attr('class').replace('sortable_row buildorder_', '');
					let buildingText = $(building).find('td:nth-child(1)').text().trim().split('\t');
					console.log(buildingText);
					let buildingName = buildingText[0].trim();
					let buildingLevel = buildingText[3].trim();
					console.log(buildingLevel);
					buildingLevel = parseInt(buildingLevel.replace('Level ', ''));
					let buildingTime = $(building).find('td:nth-child(2) > span').text()

					let buildingInfo = {}
					buildingInfo[buildingShortName] = {
						'Building Name': buildingName,
						'Building Level': buildingLevel,
						'Building Time': buildingTime
					}
					villageBuildQueue.push(buildingInfo);
				})


				const buildings = $buildingPage.find("#buildings > tbody > tr").not(":first").get();

				const villageBuildings = {villageBuildQueue}

				for (let j = 0; j < buildings.length; j++) {
					const building = buildings[j];
					console.log(building);
					let buildingShortName = $(building).attr('id').replace('main_buildrow_', '');
					let buildingName = $(building).find('td:nth-child(1) > a:nth-child(2)').text();
					let buildingCurrentLevel = $(building).find("td:nth-child(1) > span").text();
					if (buildingCurrentLevel === 'not constructed') {
						buildingCurrentLevel = 0;
					} else {
						buildingCurrentLevel = parseInt(buildingCurrentLevel.replace('Level ', ''));
					}
					let buildingNextLevel = $(building).find('td:nth-child(7) > a.btn-build').text();
					let buildingTime = $(building).find('td:nth-child(5)').text();
					villageBuildings[buildingShortName] = {
						'Building Name': buildingName,
						'Building Current Level': buildingCurrentLevel,
						'Building Next Level': buildingNextLevel,
						'Building Time': buildingTime
					}
					console.log(villageBuildings);
				}

				/* Extract report data */
				let buildingDetails = {
					"ID": villageID,
					villageBuildings
				};

				console.log(buildingDetails);
				villages.push(buildingDetails);

			}).fail(() => {
				UI.promptErrorWithReloadOption("Could not load the report.\nIs bot protection triggered? Is the internet connection broken?\nReload the page and try to run the script again.");
			}).then(() => {
					localStorage.setItem('villages_building_times', JSON.stringify(villages));
					resolve();
				}
			);
		});

		await delay(200);

		endTime = performance.now();
		averageTime.push((endTime - startTime) / 1000);
	}

	totalEndTime = performance.now();
	console.log(`Total time: ${((totalEndTime - totalStartTime) / 1000).toFixed(0)} seconds`);

	return villages;
}

/* https://stackoverflow.com/a/18197341 */
function download(filename, text) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);

	element.style.display = 'none';
	document.body.appendChild(element);

	element.click();

	document.body.removeChild(element);
}

function runScript() {
	let villages = localStorage.getItem('villages_building_times');
	villages = villages ? JSON.parse(villages) : [];
	getBuildingTimeForEachVillage(villages).then(r => {
		download(`building_times`, JSON.stringify(r));
	});
}
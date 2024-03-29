/*
	* Scrape reports in csv format from the reports (defense) page: screen=report&mode=defense
*/

if (!(game_data.screen === 'report' && (document.location.search.includes('mode=defense') || document.location.search.includes('mode=attack')))) {
	UI.InfoMessage('Going to reports > defenses report overview...', 3000, 'success');
	document.location = game_data.link_base_pure + 'report&mode=defense';
	throw new Error("Wrong page");
}

if ($("#content_value > h2").text().includes("Scraping")) {
	UI.InfoMessage('Reports scraping script already running.', 3000, 'error');
	throw new Error("Script already running");
} else {
	runScript();
	UI.InfoMessage('Reports scraping script loaded.', 3000, 'success');
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

async function getInfoForEachReport(data, reports) {
	const re_coord = /\d{1,3}\|\d{1,3}/g;

	/* Check if pagination: */
	const $pagination = $("#content_value > table > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(2)").get();
	const pageList = [];
	pageList.push($('html'));
	let numberOfRows = $("#report_list > tbody > tr").not(":first").not(":last").get().length;

	/* Add progress bar */
	$("#content_value > h2").html('<div id="infoBar" style="display: flex; align-items: center;">' +
		'Reports - Scraping:' +
		`<div style="margin-left: 10px; margin-right: 5px; width: 344px" class="progress-bar" id="progress-bar">\n` +
		'     <span class="label" style="width: 344px" id="progress"></span>\n' +
		`     <div style="width: 0%;"></div>\n` +
		'</div></div>');

	UI.InitProgressBars();

	const progressText = $('#progress-bar > div > span');
	$(progressText).html(`${$(progressText).html()} -> ~${(numberOfRows * 0.2).toFixed(0)} seconds left`);
	let $infoBar = $("#infoBar");
	$infoBar.append(createCopyButtons('full reports', localStorage.getItem('reports_full')));
	$infoBar.append(createCopyButtons('short reports', localStorage.getItem('reports_short')));

	if (!$($pagination).attr('class')) {
		/* Pagination exists because class attribute is not set */
		const pages = $($pagination).find('td > a').get();
		for (let i = 0; i < pages.length; i++) {
			await new Promise(resolve => {
				$.get($(pages).attr('href'), (data) => {
					pageList.push($(data));
					numberOfRows += $(data).find("#report_list > tbody > tr").not(":first").not(":last").get().length;
				}).fail(() => {
					UI.promptErrorWithReloadOption("Could not load the rest of the reports.\nIs bot protection triggered? Is the internet connection broken?\nReload the page and try to run the script again.");
				}).then(() => {
					resolve();
				});
			});
			await delay(200);
		}
	}
	console.log(pageList);

	const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;
	let averageTime = [];
	let totalStartTime = performance.now(); let totalEndTime = 0;
	let startTime = 0; let endTime = 0;
	let rowNumber = 1;
	for (let pageNum = 0; pageNum < pageList.length; pageNum++) {
		const rows = $(pageList[pageNum]).find("#report_list > tbody > tr").not(":first").not(":last").get();
		for (let i = 0; i < rows.length; i++) {
			let timeLeft = (averageTime.length > 0) ? ((numberOfRows - (rowNumber)) * average(averageTime)).toFixed(0) : ((numberOfRows - (rowNumber)) * 0.2).toFixed(0);
			console.log(`Processing ${rowNumber} of ${numberOfRows} | Time left: ${timeLeft} seconds`);
			UI.updateProgressBar($(".progress-bar"), rowNumber, numberOfRows);
			$("#progress").html(`${Format.number(rowNumber)} / ${Format.number(numberOfRows)} -> ~${timeLeft} seconds left`);
			$(progressText).html(`${$(progressText).html()} -> ~${timeLeft} seconds left`);
			rowNumber += 1;
			const row = rows[i];
			const reportID = $(row).attr('class').split('-')[1];
			if (reports.find((report) => reportID === report['ID'])) {
				continue;
			}

			startTime = performance.now();
			let description = $(row).find("td:eq(1) .quickedit-label").text();
			let attacker = description.split('(')[0].trim();
			let coords = description.match(re_coord);
			let origin = coords[0];
			let target = coords[1];
			let distance = calculateDistance(...origin.trim().split('|'), ...target.trim().split('|'));
			let is_fake = $(row).find("td:eq(1) img").attr("src").includes("attack_small");

			let speed = 0;
			let arrival_time;
			let sent_time;
			await new Promise(resolve => {
				$.get($(row).find("td:nth-child(2) > span.quickedit.report-title > span > a.report-link").attr("href"), (data) => {
					const $report = $(data);
					let $arrival_time = $report.find("#content_value > table > tbody > tr > td:nth-child(2) > table > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(2) > td:nth-child(2)");
					arrival_time = $arrival_time.text().trim();
					try {
						arrival_time = new Date(arrival_time);
						if (!arrival_time) {
							UI.promptErrorWithReloadOption("Report is not parseable. \nIt is likely that the bot protection is triggered.\nReload the page and try to run the script again.");
						}
					} catch (e) {
						UI.promptErrorWithReloadOption("Report is not parseable. \nIt is likely that the bot protection is triggered.\nReload the page and try to run the script again.");
					}

					let attackers = []
					$report.find("#attack_info_att_units > tbody > tr:nth-child(2) > td.unit-item").each(
						(i, row) => {
							attackers.push(parseInt($(row).text()));
						}
					);

					let attackersLosses = [];
					$report.find("#attack_info_att_units > tbody > tr:nth-child(3) > td.unit-item").each(
						(i, row) => {
							attackersLosses.push(parseInt($(row).text()));
						}
					);

					let attackersFlag;
					let attackersBuffs = [];
					let $buffRow;
					let flag_or_buff = $report.find("#attack_info_att > tbody > tr:nth-child(4) > td:nth-child(1)");
					if (flag_or_buff.text()) {
						/* Check if row 4 exists */
						if (flag_or_buff.text().trim() === "Flag:") {
							/* Check if row 4 is flag */
							attackersFlag = $report.find("#attack_info_att > tbody > tr:nth-child(4) > td:nth-child(2)").text().trim();
							$buffRow = $report.find("#attack_info_att > tbody > tr:nth-child(5) > td:nth-child(2)");
							if ($buffRow.html()) {
								/* Check if row 5 is buffs */
								$buffRow.html().split('<br>').forEach(
									(buffText) => {
										let cleanBuffs = $.trim(buffText);
										if (cleanBuffs !== "") {
											attackersBuffs.push(cleanBuffs);
										}
									}
								)
							}
						} else {
							/* Row 4 must be buffs */
							$report.find("#attack_info_att > tbody > tr:nth-child(4) > td:nth-child(2)").html().split('<br>').forEach(
								(buffText) => {
									let cleanBuffs = $.trim(buffText);
									if (cleanBuffs !== "") {
										attackersBuffs.push(cleanBuffs);
									}
								}
							);
						}
					}

					let luck;
					$report.find('#attack_luck > tbody > tr').each(function () {
						let percentageFirst = $(this).find('td:first-child b').text().trim();
						let percentageLast = $(this).find('td:last-child b').text().trim();

						if (percentageFirst) {
							luck = percentageFirst;
						} else if (percentageLast) {
							luck = percentageLast;
						}
					});

					let defenders = [];
					$report.find("#attack_info_def_units > tbody > tr:nth-child(2) > td.unit-item").each(
						(i, row) => {
							defenders.push(parseInt($(row).text()));
						}
					);

					let defendersLosses = []
					$report.find("#attack_info_def_units > tbody > tr:nth-child(3) > td.unit-item").each(
						(i, row) => {
							defendersLosses.push(parseInt($(row).text()));
						}
					);

					let defendersFlag;
					let defendersBuffs = [];
					let $defbuffRow;
					let def_flag_or_buff = $report.find("#attack_info_def > tbody > tr:nth-child(4) > td:nth-child(1)");
					if (def_flag_or_buff.text()) {
						/* Check if row 4 exists */
						if (def_flag_or_buff.text().trim() === "Flag:") {
							/* Check if row 4 is flag */
							defendersFlag = $report.find("#attack_info_def > tbody > tr:nth-child(4) > td:nth-child(2)").text().trim();
							$defbuffRow = $report.find("#attack_info_def > tbody > tr:nth-child(5) > td:nth-child(2)");
							if ($defbuffRow.html()) {
								/* Check if row 5 is buffs */
								$defbuffRow.html().split('<br>').forEach(
									(buffText) => {
										let cleanBuffs = $.trim(buffText);
										if (cleanBuffs !== "") {
											defendersBuffs.push(cleanBuffs);
										}
									}
								);
							}
						} else {
							/* Row 4 must be buffs */
							$report.find("#attack_info_def > tbody > tr:nth-child(4) > td:nth-child(2)").html().split('<br>').forEach(
								(buffText) => {
									let cleanBuffs = $.trim(buffText);
									if (cleanBuffs !== "") {
										defendersBuffs.push(cleanBuffs);
									}
								}
							);
						}
					}
					speed = findSpeed(attackers);

					sent_time = subtractMinutes(arrival_time, speed*distance);
					sent_time = fixLocale(sent_time);
					arrival_time = fixLocale(arrival_time);

					/* Extract report data */
					let report_details = {
						"ID": reportID,
						"Subject": $report.find("#content_value > table > tbody > tr > td:nth-child(2) > table > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(1) > th:nth-child(2)").text().trim(),
						"Battle time": arrival_time,
						"Title": $report.find("#content_value > table > tbody > tr > td:nth-child(2) > table > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(3) > td > h3").text().trim(),
						"Speed": speed,
						"Distance": distance,
						"Sent Time": sent_time,
						"Attack Luck": luck,
						"Morale": $report.find("#content_value > table > tbody > tr > td:nth-child(2) > table > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(3) > td > div.report_image > div > h4:nth-child(3)").text().trim().slice(8),
						"Attacker": $report.find("#attack_info_att > tbody > tr:nth-child(1) > th:nth-child(2) > a").text().trim(),
						"Origin": $report.find("#attack_info_att > tbody > tr:nth-child(2) > td:nth-child(2) > span > a:nth-child(1)").text().trim(),
						"Attackers": attackers,
						"Attackers Losses": attackersLosses,
						"Attackers Flag": attackersFlag,
						"Attackers Buffs": attackersBuffs,
						"Defender": $report.find("#attack_info_def > tbody > tr:nth-child(1) > th:nth-child(2)").text().trim(),
						"Destination": $report.find("#attack_info_def > tbody > tr:nth-child(2) > td:nth-child(2) > span > a:nth-child(1)").text().trim(),
						"Defenders": defenders,
						"Defenders Losses": defendersLosses,
						"Defenders Flag": defendersFlag,
						"Defenders Buffs": defendersBuffs
					};
					console.log(report_details);
					reports.push(report_details);

					/* Check for fang (small attacks with catapults) */
					if (is_fake && attackers[9] > 50) {
						is_fake = false;
					}

				}).fail(() => {
					UI.promptErrorWithReloadOption("Could not load the report.\nIs bot protection triggered? Is the internet connection broken?\nReload the page and try to run the script again.");
				}).then(() => {
						data += `${attacker},${origin},${target},${arrival_time},${sent_time},${distance},${speed},${is_fake}\n`;
						console.log(`attacker: ${attacker}, origin: ${origin}, target: ${target}, arrival time: ${arrival_time}, sent time: ${sent_time}, distance: ${distance}, speed: ${speed}, is fake: ${is_fake}`);
						localStorage.setItem('reports_short', data);
						localStorage.setItem('reports_full', JSON.stringify(reports));
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
	}
	return data;
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
	let data = localStorage.getItem('reports_short');
	data = data ? data : "attacker,origin,target,arrival_time,sent_time,distance,speed,fake\n";
	let reports = localStorage.getItem('reports_full');
	reports = reports ? JSON.parse(reports) : [];

	getInfoForEachReport(data, reports).then(r => {
		download(`reports_short_${reports.length}.csv`, r);
		download(`reports_full_${reports.length}.json`, JSON.stringify(reports));
	});
}
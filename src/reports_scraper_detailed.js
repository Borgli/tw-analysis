/*
	* Scrape reports in csv format from the reports (defense) page: screen=report&mode=defense
*/

if (!document.URL.includes("screen=report&mode=defense")) {
	alert("Run this script on the reports > defenses page")
	throw new Error("Wrong page")
}

const re_coord = /\d{1,3}\|\d{1,3}/g

let data = "attacker,origin,target,arrival_time,speed,fake\n"

function parseDate(dateStr) {
	let current_date = new Date();
	let parsed_date = new Date(dateStr);
	// datestr is in UTC, but date is in local, so we need to adjust for timezone
	parsed_date.setMinutes(parsed_date.getMinutes() - parsed_date.getTimezoneOffset())

	if (parsed_date < current_date) {
		parsed_date.setFullYear(current_date.getFullYear())
	}
	// ISO-string prints it as UTC
    return parsed_date.toISOString();
}

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
}

function findSpeed(attackers) {
	let activeAttackers = Object.values(speeds).filter((_, index) => attackers[index])
	return activeAttackers.sort()[0]
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function getInfoForEachReport() {
	const rows = $("#report_list > tbody > tr").not(":first").not(":last").get();
	for (let i = 0; i < rows.length; i++) {
		console.log(`Processing ${i+1} of ${rows.length}`)
		const row = rows[i];
		let description = $(row).find("td:eq(1) .quickedit-label").text()
		let attacker = description.split('(')[0].trim()
		let coords = description.match(re_coord)
		let origin = coords[0]
		let target = coords[1]
		let is_fake = $(row).find("td:eq(1) img").attr("src").includes("attack_small")

		let speed = 0;
		let arrival_time;
		await new Promise(resolve => {
			$.get($(row).find("td:nth-child(2) > span.quickedit.report-title > span > a.report-link").attr("href"), (data) => {
				const $report = $(data);
				let $arrival_time = $report.find("#content_value > table > tbody > tr > td:nth-child(2) > table > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(2) > td:nth-child(2)")
				arrival_time = $arrival_time.text().trim()
				arrival_time = parseDate(arrival_time)
				let attackers = []
				$report.find("#attack_info_att_units > tbody > tr:nth-child(2) > td.unit-item").each(
					(i, row) => {
						attackers.push(parseInt($(row).text()))
					}
				)
				// Check if fang
				if (is_fake && attackers[9] > 50) {
					is_fake = false;
				}
				speed = findSpeed(attackers);
				//console.log($report.find("#content_value > table > tbody > tr > td:nth-child(2) > table > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(1) > th:nth-child(2) > span > span > span").text())
			}).then(() => {
					data += `${attacker},${origin},${target},${arrival_time},${speed},${is_fake}\n`
					console.log(`attacker: ${attacker}, origin: ${origin}, target: ${target}, arrival time: ${arrival_time}, speed: ${speed}, is fake: ${is_fake}`)
					resolve();
				}
			)
		})

		await delay(500);
	}
}

// https://stackoverflow.com/a/18197341
function download(filename, text) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);

	element.style.display = 'none';
	document.body.appendChild(element);

	element.click();

	document.body.removeChild(element);
}

getInfoForEachReport().then(r => download("data.csv", data));


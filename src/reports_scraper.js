/*
	* Scrape reports in csv format from the reports (defense) page: screen=report&mode=defense
*/

if (!document.URL.includes("screen=report&mode=defense")) {
	alert("Run this script on the reports > defenses page")
	throw new Error("Wrong page")
}

const re_speed = /-\s\((\w+)/
const re_coord = /\d{1,3}\|\d{1,3}/g
const re_distance = /distance ([\d.]+)/
const re_sent = /sent\s+([A-Za-z]+\s+\d{2},\s+\d{2}:\d{2}:\d{2})/
const re_arrival = /arrival\s+([A-Za-z]+\s+\d{2},\s+\d{2}:\d{2}:\d{2})/

let data = ""

$("#report_list > tbody > tr").not(":first").not(":last").each(
	(i, row) => {
		let description = $(row).find("td:eq(1) .quickedit-label").text()
		let attacker = description.split('(')[0].trim()
		let coords = description.match(re_coord)
		let origin = coords[0]
		let target = coords[1]
		let speed = description.match(re_speed)[1].toLowerCase()
		let distance = description.match(re_distance)
		if (distance) {
			distance = distance[1]
		}
		let sent_time = description.match(re_sent)
		if (sent_time) {
			sent_time = sent_time[1]
		}
		let arrival_time = description.match(re_arrival)
		if (arrival_time) {
			arrival_time = arrival_time[1]
		} else {
			arrival_time = $(row).find("td:eq(2)").text()
		}
		let is_fake = $(row).find("td:eq(1) img").attr("src").includes("attack_small")
		// TODO: calculate distance or let it be implied by origin-destination?
		data += `${attacker},${origin},${target},${arrival_time},${sent_time},${speed},${distance},${is_fake}\n`
		console.log(`attacker: ${attacker}, origin: ${origin}, target: ${target}, arrival time: ${arrival_time}, sent time: ${sent_time}, speed: ${speed}, distance: ${distance}, is fake: ${is_fake}`)
	}
)

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

download("data.csv", data)


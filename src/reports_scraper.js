/*
	* Scrape reports in csv format from the reports (defense) page: screen=report&mode=defense
*/

if (!document.URL.includes("screen=report&mode=defense")) {
	alert("Run this script on the reports > defenses page")
	throw new Error("Wrong page")
}

const re_speed = /([^\/]+)$/
const re_coord = /\d{3}\|\d{3}/g

let data = ""

$("#report_list > tbody > tr").not(":first").not(":last").each(
	(i, row) => {
		let description = $(row).find("td:eq(1) .quickedit-label").text()
		let attacker = description.split('(')[0].trim()
		let coords = description.match(re_coord)
		let origin = coords[0]
		let destination = coords[1]
		let arrival_time = $(row).find("td:eq(2)").text() // TODO: parse date, since this includes a comma (doesnt work well with csv...)
		let is_fake = $(row).find("td:eq(1) img").attr("src").includes("attack_small")
		// TODO: calculate distance or let it be implied by origin-destination?
		data += `${attacker},${origin},${destination},${arrival_time},${is_fake}\n`
		//console.log(`attacker: ${attacker}, origin: ${origin}, destination: ${destination}, arrival time: ${arrival_time}, is fake: ${is_fake}`)
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


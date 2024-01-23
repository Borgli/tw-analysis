/*
	* Scrape incomings in csv format from the incomings page: mode=incomings&subtype=attacks
*/

if (!document.URL.includes("mode=incomings&subtype=attacks")) {
	alert("Run this script on the incomings > attacks page")
	throw new Error("Wrong page")
}

const re_speed = /([^\/]+)$/
const re_coord = /\d{3}\|\d{3}/

let data = ""

$("#incomings_table tbody tr.nowrap").each(
	(i, row) => {
		let speed = re_speed.exec($(row).find("td:eq(0) img:eq(1)").attr("src"))[0].split('.')[0]
		let destination = re_coord.exec($(row).find("td:eq(1)").text())[0]
		let origin = re_coord.exec($(row).find("td:eq(2)").text())[0]
		let player = $(row).find("td:eq(3)").text().trim()
		let distance = $(row).find("td:eq(4)").text().trim()
		let arrival_time = $(row).find("td:eq(5)").text().trim() // TODO: parse (tomorrow...)
		data += `${speed},${destination},${origin},${player},${distance},${arrival_time}\n`
		//console.log(`speed: ${speed}, dest: ${destination}, origin: ${origin}, player: ${player}, distance: ${distance}, arrival time: ${arrival_time}`)
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


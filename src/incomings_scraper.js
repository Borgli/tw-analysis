/*
	* Scrape incomings in csv format from the incomings page: mode=incomings&subtype=attacks
*/

if (!(game_data.screen === 'overview_villages' && document.location.search.includes('mode=incomings') && document.location.search.includes('subtype=attacks'))) {
	UI.InfoMessage('Going to incomings overview ...', 3000, 'success');
	document.location = game_data.link_base_pure + 'overview_villages&mode=incomings&subtype=attacks';
	throw new Error("Wrong page");
}

const re_speed = /([^\/]+)$/
const re_coord = /\d{1,3}\|\d{1,3}/

let data = "attacker,origin,target,arrival_time,speed\n"

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

function parseArrivalTime(timeStr) {
    const now = new Date();
    let datePart;
    let timePart = timeStr.split(' at ')[1];

    if (timeStr.startsWith('on ')) {
        // Format: "on 26.01. at 13:08:33:926"
        datePart = timeStr.split(' ')[1];
        const [day, month] = datePart.split('.').map(Number);
        return new Date(now.getFullYear(), month - 1, day, ...timePart.split(':').map(Number));
    } else if (timeStr.startsWith('today')) {
        // Format: "today at 13:48:37:907"
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...timePart.split(':').map(Number));
    } else if (timeStr.startsWith('tomorrow')) {
        // Format: "tomorrow at 00:13:49:464"
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), ...timePart.split(':').map(Number));

    } else if (timeStr.startsWith('yesterday')) {
        // Format: "yesterday at 00:13:49:464"
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), ...timePart.split(':').map(Number));
    } else {
        // Unsupported format
        return null;
    }
}

function fixLocale(parsed_date) {
	let current_date = new Date();
	// datestr is in UTC, but date is in local, so we need to adjust for timezone
	parsed_date.setMinutes(parsed_date.getMinutes() - parsed_date.getTimezoneOffset())

	if (parsed_date < current_date) {
		parsed_date.setFullYear(current_date.getFullYear())
	}
	// ISO-string prints it as UTC
    return parsed_date.toISOString();
}

$("#incomings_table tbody tr.nowrap").each(
	(i, row) => {
		let attacker = $(row).find("td:eq(3)").text().trim()
		let origin = re_coord.exec($(row).find("td:eq(2)").text())[0]
		let target = re_coord.exec($(row).find("td:eq(1)").text())[0]
		let speed = re_speed.exec($(row).find("td:eq(0) img:eq(1)").attr("src"))[0].split('.')[0]
		speed = speeds[speed]
		let arrival_time = $(row).find("td:eq(5)").text().trim()
		arrival_time = parseArrivalTime(arrival_time)
		arrival_time = fixLocale(arrival_time)
		data += `${attacker},${origin},${target},${arrival_time},${speed}\n`
		console.log(`attacker: ${attacker}, origin: ${origin}, target: ${target}, arrival time: ${arrival_time}, speed: ${speed}`)
		//data += `${speed},${destination},${origin},${player},${distance},${arrival_time}\n`
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


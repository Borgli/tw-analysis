const re_speed = /([^\/]+)$/
const re_coord = /\d{1,3}\|\d{1,3}/;

let data = "";

$("#incomings_table > tbody > tr:nth-child(1)").append("<th>Sent Time</th>").attr("width", "*");

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
    } else {
        // Unsupported format
        return null;
    }
}

function formatDate(date) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

    if (isToday) {
        return `today at ${hours}:${minutes}:${seconds}:<span class="grey small">${milliseconds}</span>`;
    } else if (isYesterday) {
        return `yesterday at ${hours}:${minutes}:${seconds}:<span class="grey small">${milliseconds}</span>`;
    } else {
        return `on ${day}.${month}. at ${hours}:${minutes}:${seconds}:<span class="grey small">${milliseconds}</span>`;
    }
}

function subtractMinutes(date, minutes) {
    const milliseconds = minutes * 60 * 1000; // Convert minutes to milliseconds
    return new Date(date.getTime() - milliseconds);
}

const speeds = {
    "ram": 30,
    "axe": 18,
    "spy": 8,
    "light": 10,
    "heavy": 11
}
// Ensure table and row selectors are correct
$("#incomings_table tbody tr.nowrap").each((i, row) => {
    const speed = re_speed.exec($(row).find("td:eq(0) img:eq(1)").attr("src"))[0].split('.')[0]
    const destination = re_coord.exec($(row).find("td:eq(1)").text())[0];
    const origin = re_coord.exec($(row).find("td:eq(2)").text())[0];
    const player = $(row).find("td:eq(3)").text().trim();
    const distanceStr = $(row).find("td:eq(4)").text().trim();
    const distance = parseFloat(distanceStr); // Ensure distance is a number
    const arrival_time = $(row).find("td:eq(5)").text().trim();
	console.log(`speed: ${speed}, dest: ${destination}, origin: ${origin}, player: ${player}, distance: ${distance}, arrival time: ${arrival_time}`)

    data += `${speed},${destination},${origin},${player},${distance},${arrival_time}\n`;

    const adjustedTime = subtractMinutes(parseArrivalTime(arrival_time), speeds[speed]*distance);
    $(row).append(`<td>${formatDate(adjustedTime)}</td>`)
});
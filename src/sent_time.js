
if (!(game_data.screen === 'overview_villages' && document.location.search.includes('mode=incomings') && document.location.search.includes('subtype=attacks'))) {
  UI.InfoMessage('Going to incomings overview ...', 3000, 'success');
  document.location = game_data.link_base_pure + 'overview_villages&mode=incomings&subtype=attacks';
  throw new Error("Wrong page");
}

if ($("#incomings_table > tbody > tr:nth-child(1)").text().includes("Sent time")) {
  UI.InfoMessage('Sent time script already running.', 3000, 'error');
  throw new Error("Script already running");
} else {
  runScript();
  UI.InfoMessage('Sent time script loaded.', 3000, 'success');
}

function parseArrivalTime(timeStr) {
  const now = new Date();
  let datePart;
  let timePart = timeStr.split(' at ')[1];

  if (timeStr.startsWith('on ')) {
    /* Format: "on 26.01. at 13:08:33:926" */
    datePart = timeStr.split(' ')[1];
    const [day, month] = datePart.split('.').map(Number);
    return new Date(now.getFullYear(), month - 1, day, ...timePart.split(':').map(Number));
  } else if (timeStr.startsWith('today')) {
    /* Format: "today at 13:48:37:907" */
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...timePart.split(':').map(Number));
  } else if (timeStr.startsWith('tomorrow')) {
    /* Format: "tomorrow at 00:13:49:464" */
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), ...timePart.split(':').map(Number));

  } else if (timeStr.startsWith('yesterday')) {
    /* Format: "yesterday at 00:13:49:464" */
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), ...timePart.split(':').map(Number));
  } else {
    /* Unsupported format */
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
  const milliseconds = minutes * 60 * 1000;
  return new Date(date.getTime() - milliseconds);
}

function sortTableByColumn(columnIndex, ascending = true) {
  const $tbody = $("#incomings_table tbody");
  // Select all rows except the first and last
  const $rows = $tbody.find("tr.nowrap");
  const $bottom = $tbody.find("tr:last-child");

  $rows.sort((a, b) => {
    const valA = $(a).find(`td:eq(${columnIndex})`).text().trim().toLowerCase();
    const valB = $(b).find(`td:eq(${columnIndex})`).text().trim().toLowerCase();

    /* Check if values are numeric and compare accordingly */
    const isNumeric = !isNaN(parseFloat(valA)) && isFinite(valA) && !isNaN(parseFloat(valB)) && isFinite(valB);
    if (isNumeric) {
      return ascending ? valA - valB : valB - valA;
    }

    /* Try to convert to time if possible */
    const timeValA = parseArrivalTime(valA);
    const timeValB = parseArrivalTime(valB);
    if (timeValA && timeValB) {
      return ascending ? timeValA - timeValB : timeValB - timeValA;
    }

    /* Fallback for non-numeric, e.g., string comparison */
    if (valA < valB) return ascending ? -1 : 1;
    if (valA > valB) return ascending ? 1 : -1;
    return 0;

  }).appendTo($tbody);

  $bottom.appendTo($tbody);
}

function addFakeColumn(data) {
  $("#incomings_table > tbody > tr:nth-child(1)").append("<th><a href='#'>Fake</a></th>").attr("width", "*");
  $("#incomings_table tbody tr:last-child th:nth-child(2)").attr("colspan", 8);

  $("#incomings_table tbody tr.nowrap").each((i, row) => {
    $(row).append(`<td style="font-weight: 700; text-decoration: none; color: #603000">${data[i]['predictions'] === 1}</td>`);
  });

  // Add event listener for sorting by the fake column
  $("#incomings_table > tbody > tr:nth-child(1) > th:nth-child(9)").click(function(e) {
    e.preventDefault();
    const topBar = $("#incomings_table > tbody > tr:nth-child(1) > th").get();
    let table = $("#incomings_table");
    let currentColumn = table.data("currentColumn");
    let ascending = table.data("ascending");
    let i = 8;

    /* If we click the same column we want the sorting to reverse, else we change to the new column */
    if (i === currentColumn) {
      ascending = !ascending;
    } else {
      $(topBar[currentColumn]).removeAttr('class');
      let text = $(topBar[currentColumn]).find('a').text();
      $(topBar[currentColumn]).empty().append($('<a href="#">').html(text));
      if (currentColumn === 5) {
        $(topBar[currentColumn + 1]).removeAttr('class');
      }
      currentColumn = i;
      ascending = true;
      $(topBar[currentColumn]).attr('class', 'selected');
      if (currentColumn === 5) {
        $(topBar[currentColumn + 1]).attr('class', 'selected');
      }
    }

    let text = $(topBar[i]).find('a').text();
    if (ascending) {
      $(topBar[i]).empty().append($('<a href="#">').html(text + " " + table.data('ascendingArrow')));
    } else {
      $(topBar[i]).empty().append($('<a href="#">').html(text + " " + table.data('descendingArrow')));
    }

    table.data("currentColumn", currentColumn);
    table.data("ascending", ascending);

    sortTableByColumn(currentColumn, ascending);
  });
}

function createLoadPredictionsButton(buttonText) {
  let fileInput = $('<input/>', {
    type: 'file',
    style: 'display: none;',
    accept: '.json',
    change: function(e) {
      let file = e.target.files[0];
      if (file) {
        let reader = new FileReader();
        reader.onload = function(e) {
          let data;
          try {
            data = JSON.parse(e.target.result);
            console.log('Loaded JSON Data:', data);
            addFakeColumn(data);
          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        };
        reader.readAsText(file);
      }
    }
  });

  $('body').append(fileInput);

  return $('<button/>', {
    text: buttonText,
    class: 'btn',
    style: 'margin-left: 1px',
    click: function() {
      fileInput.click();
    }
  });
}

function runScript() {
  const re_speed = /([^\/]+)$/;
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

  $("#paged_view_content > a").wrap('<div id="buttonBar"></div>');
  $("#buttonBar").append(createLoadPredictionsButton('Add predictions'));

  $("#incomings_table > tbody > tr:nth-child(1)").append("<th><a href='#'>Sent time</a></th>").attr("width", "*");
  $("#incomings_table tbody tr:last-child th:nth-child(2)").attr("colspan", 7);

  let table = $("#incomings_table");
  table.data("currentColumn", 5);
  table.data("ascending", true);

  table.data("descendingArrow", '<img src="https://dsen.innogamescdn.com/asset/9900b900/graphic/map/map_s.png" class="" data-title="Distance">');
  table.data("ascendingArrow", '<img src="https://dsen.innogamescdn.com/asset/9900b900/graphic/map/map_n.png" class="" data-title="Distance">');

  $("#incomings_table > tbody > tr:nth-child(1) > th:nth-child(6)").html('<a href="#">Arrives in ' + table.data('ascendingArrow') + '</a>').attr('class', 'selected');
  $("#incomings_table > tbody > tr:nth-child(1) > th:nth-child(7)").attr('class', 'selected');

  let topBar = $("#incomings_table > tbody > tr:nth-child(1) > th").get();
  for (let i = 1; i < topBar.length; i++) {
    $(topBar[i]).find('a').attr('href', '#');

    $(topBar[i]).on('click', (e) => {
      e.preventDefault();
      topBar = $("#incomings_table > tbody > tr:nth-child(1) > th").get();
      let currentColumn = table.data("currentColumn");
      let ascending = table.data("ascending");

      /* If the column is Arrival In, we sort it together with Arrival Time */
      if (i === 6) {
        i = 5;
      }

      /* If we click the same column we want the sorting to reverse, else we change to the new column */
      if (i === currentColumn) {
        ascending = !ascending;
      } else {
        $(topBar[currentColumn]).removeAttr('class');
        let text = $(topBar[currentColumn]).find('a').text();
        $(topBar[currentColumn]).empty().append($('<a href="#">').html(text));
        if (currentColumn === 5) {
          $(topBar[currentColumn + 1]).removeAttr('class');
        }
        currentColumn = i;
        ascending = true;
        $(topBar[currentColumn]).attr('class', 'selected');
        if (currentColumn === 5) {
          $(topBar[currentColumn + 1]).attr('class', 'selected');
        }
      }

      let text = $(topBar[i]).find('a').text();
      if (ascending) {
        $(topBar[i]).empty().append($('<a href="#">').html(text + " " + table.data('ascendingArrow')));
      } else {
        $(topBar[i]).empty().append($('<a href="#">').html(text + " " + table.data('descendingArrow')));
      }

      table.data("currentColumn", currentColumn);
      table.data("ascending", ascending);

      sortTableByColumn(i, ascending);
    });
  }

  $("#incomings_table tbody tr.nowrap").each((i, row) => {
    const speed = re_speed.exec($(row).find("td:eq(0) img:eq(1)").attr("src"))[0].split('.')[0];
    const distanceStr = $(row).find("td:eq(4)").text().trim();
    const distance = parseFloat(distanceStr);
    const arrival_time = $(row).find("td:eq(5)").text().trim();
    const adjustedTime = subtractMinutes(parseArrivalTime(arrival_time), speeds[speed]*distance);
    if (speed !== "undefined") {
      $(row).append(`<td>${formatDate(adjustedTime)}</td>`);
    } else {
      $(row).append(`<td>---invalid label---</td>`);
    }
  });
}


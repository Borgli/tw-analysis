/*
	* Scrape reports in csv format from the reports (defense) page: screen=report&mode=defense
*/

if (!(game_data.screen === 'report' && game_data.mode && game_data.mode === 'defense')) {
	UI.InfoMessage('Going to reports > defenses report overview...', 3000, 'success');
	document.location = game_data.link_base_pure + 'report&mode=defense';
	throw new Error("Wrong page");
}

const re_coord = /\d{1,3}\|\d{1,3}/g;

let data = "attacker,origin,target,arrival_time,speed,fake\n";
let reports = [];

function parseDate(dateStr) {
  let current_date = new Date();
  let parsed_date = new Date(dateStr);
  /* datestr is in UTC, but date is in local, so we need to adjust for timezone */
  parsed_date.setMinutes(parsed_date.getMinutes() - parsed_date.getTimezoneOffset());

  if (parsed_date < current_date) {
    parsed_date.setFullYear(current_date.getFullYear());
  }

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
};

function findSpeed(attackers) {
  let activeAttackers = Object.values(speeds).filter((_, index) => attackers[index]);
  return activeAttackers.sort()[0];
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;

async function getInfoForEachReport() {
  /* Check if pagination: */
  const $pagination = $("#content_value > table > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(2)").get();
  const pageList = [];
  pageList.push($('html'));
  let numberOfRows = $("#report_list > tbody > tr").not(":first").not(":last").get().length;
  if (!$($pagination).attr('class')) {
    /* Pagination exists because class attribute is not set */
    const pages = $($pagination).find('td > a').get();
    for (let i = 0; i < pages.length; i++) {
      await new Promise(resolve => {
        $.get($(pages).attr('href'), (data) => {
          pageList.push($(data));
          numberOfRows += $(data).find("#report_list > tbody > tr").not(":first").not(":last").get().length;
        }).then(() => {
          resolve();
        });
      });
      await delay(200);
    }
  }
  ((numberOfRows - (1)) * 0.2).toFixed(0)
  /* Add progress bar */
  $("#content_value > h2").html('<div style="display: flex; align-items: center;">' +
    'Reports - Scraping:' +
    `<div style="margin-left: 10px; width: 360px" class="progress-bar" id="progress-bar">\n` +
    '     <span class="label" style="width: 360px" id="progress"></span>\n' +
    `     <div style="width: 0%;"></div>\n` +
    '</div></div>');

  UI.InitProgressBars();

  const progressText = $('#progress-bar > div > span');
  $(progressText).html(`${$(progressText).html()} -> ~${(numberOfRows * 0.2).toFixed(0)} seconds left`);

  console.log(pageList);

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
      startTime = performance.now();
      const row = rows[i];
      let description = $(row).find("td:eq(1) .quickedit-label").text();
      let attacker = description.split('(')[0].trim();
      let coords = description.match(re_coord);
      let origin = coords[0];
      let target = coords[1];
      let is_fake = $(row).find("td:eq(1) img").attr("src").includes("attack_small");

      let speed = 0;
      let arrival_time;
      await new Promise(resolve => {
        $.get($(row).find("td:nth-child(2) > span.quickedit.report-title > span > a.report-link").attr("href"), (data) => {
          const $report = $(data);
          let $arrival_time = $report.find("#content_value > table > tbody > tr > td:nth-child(2) > table > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(2) > td:nth-child(2)");
          arrival_time = $arrival_time.text().trim();
          arrival_time = parseDate(arrival_time);

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

          /* Extract report data */
          let report_details = {
            "Subject": $report.find("#content_value > table > tbody > tr > td:nth-child(2) > table > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(1) > th:nth-child(2)").text().trim(),
            "Battle time": arrival_time,
            "Title": $report.find("#content_value > table > tbody > tr > td:nth-child(2) > table > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(3) > td > h3").text().trim(),
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
          speed = findSpeed(attackers);

        }).then(() => {
            data += `${attacker},${origin},${target},${arrival_time},${speed},${is_fake}\n`;
            console.log(`attacker: ${attacker}, origin: ${origin}, target: ${target}, arrival time: ${arrival_time}, speed: ${speed}, is fake: ${is_fake}`);
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

getInfoForEachReport().then(r => {
  download("data.csv", data);
  download("reports.json", JSON.stringify(reports));
});


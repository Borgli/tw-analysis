
if (!(game_data.screen === 'place' && game_data.mode && game_data.mode.replace('#', '') === 'units')) {
	UI.InfoMessage('Going to Rallypoint Troops overview ...', 3000, 'success');
	document.location = game_data.link_base_pure + 'place&mode=units';
	throw new Error("Wrong page");
}

if ($("#content_value > h3:nth-child(5)").text().endsWith("Sortable")) {
    UI.InfoMessage('Support sorter script already loaded.', 3000, 'error');
} else {
    $("#content_value > h3:nth-child(5)").text("Defenses - Sortable");
    runScript();
    UI.InfoMessage('Support sorter script loaded.', 3000, 'success');
}

function sortTableByColumn(columnIndex, ascending = true) {
    const $tbody = $("#units_home tbody");
    const $rowsToSort = $tbody.find("tr").slice(2, -2);
    const $bottom = $tbody.find("tr").slice(-2);

    $rowsToSort.sort((a, b) => {
        const valA = $(a).find(`td:eq(${columnIndex})`).text().trim().toLowerCase();
        const valB = $(b).find(`td:eq(${columnIndex})`).text().trim().toLowerCase();

        /* Check if values are numeric and compare accordingly */
        const isNumeric = !isNaN(parseFloat(valA)) && isFinite(valA) && !isNaN(parseFloat(valB)) && isFinite(valB);
        if (isNumeric) {
            return ascending ? valA - valB : valB - valA;
        }

        /* Fallback for non-numeric, e.g., string comparison */
        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
    });

    /* Append sorted rows back, maintaining the position of the first two and last two rows.*/
    $.each($rowsToSort, function(index, row) {
        $tbody.append(row);
    });
    $bottom.appendTo($tbody);
}

function runScript() {
    let currentColumn = 1;
    let ascending = true;
    let descending_arrow = '<a html="#"><img src="https://dsen.innogamescdn.com/asset/9900b900/graphic/map/map_s.png" class="" data-title="Distance"></a>';
    let ascending_arrow = '<a html="#"><img src="https://dsen.innogamescdn.com/asset/9900b900/graphic/map/map_n.png" class="" data-title="Distance"></a>';

    $("#units_home > tbody > tr:nth-child(1) > th:nth-child(1)").html(ascending_arrow).attr('style', 'text-align:center');
    $("#units_home > tbody > tr:nth-child(1) > th:nth-child(1)").on('click', () => {
        ascending = !ascending;
        if (ascending) {
            $("#units_home > tbody > tr:nth-child(1) > th:nth-child(1)").html(ascending_arrow);
        } else {
            $("#units_home > tbody > tr:nth-child(1) > th:nth-child(1)").html(descending_arrow);
        }

        sortTableByColumn(currentColumn, ascending);
    });

    $("#units_home > tbody > tr:nth-child(1) > th:nth-child(3)").attr('style', 'text-align:center');
    $("#units_home > tbody > tr:nth-child(1) > th:nth-child(2)").attr('class', 'selected');

    const topBar = $("#units_home > tbody > tr:nth-child(1) > th").get();
    for (let i = 1; i < topBar.length; i++) {
        if (i === 1) {
            $(topBar[i]).html("<a href='#'>Origin</a>");
            $(topBar[i]).width(320);
        } else {
            const hasLink = $(topBar[i]).find('a').length > 0;
            let content;

            if (hasLink) {
                content = $(topBar[i]).find('a').html();
            } else {
                content = $(topBar[i]).html();
            }

            const newLink = $('<a href="#">').html(content);
            $(topBar[i]).empty().append(newLink);
        }

        $(topBar[i]).on('click', (e) => {
            e.preventDefault();
            if (i === currentColumn) {
                ascending = !ascending;
            } else {
                $(topBar[currentColumn]).removeAttr('class');
                currentColumn = i;
                ascending = true;
                $(topBar[currentColumn]).attr('class', 'selected');
            }
            if (ascending) {
                $("#units_home > tbody > tr:nth-child(1) > th:nth-child(1)").html(ascending_arrow);
            } else {
                $("#units_home > tbody > tr:nth-child(1) > th:nth-child(1)").html(descending_arrow);
            }

            sortTableByColumn(i, ascending);
        });
    }
}



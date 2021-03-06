var d3 = require("d3");
var d3tip = require('d3-tip')(d3);
var $ = require("jquery");

//console.log("src/js/vis/1_air.js");

var airVisualization = function (container_selector, service) {

    var model = this;

    var target_dataset_key = 'cityPmData';

    model.data = service.getActiveDataset(target_dataset_key);

    model.selected_unit = {key: "pm2.5Mean", safe_level: 10};

    var margin = {top: 40, right: 20, bottom: 60, left: 40};
    var width = 500 - margin.left - margin.right,
        height = 200 - margin.top - margin.bottom;
    var gauge_height = 25;
    var gauge_label_spacing = 10;

    model.other_cities = [];

    // Helper functions
    model.buildGaugeBackground = function () {
        // Draw the linear gauge body
        var gradient = model.svg.append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0")
            .attr("spreadMethod", "pad");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#FFF")
            .attr("stop-opacity", 1);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#c00")
            .attr("stop-opacity", 1);

        model.linear_guage_body = model.lines.append("rect")
            .attr("width", model.x(d3.max(model.data, function (d) {
                return d[model.selected_unit.key];
            })))
            .attr("height", gauge_height)
            .style("fill", "url(#gradient)")
            .attr("stroke", "grey");
    };
    model.updateOtherCitiesView = function () {
        $("#other-selected-cities").html("");
        var other_cities = service.getOtherCities();

        other_cities.forEach(function (cityData, index) {
            $("#other-selected-cities").append('<li class="list-group-item">' +
                cityData.city +
                ", " +
                cityData.country +
                '<button  data-index="' + index + '" class="remove-other-city btn btn-danger btn-xs pull-right">&times;</button>' +
                '</li>');
        });
    };
    model.prepopulateCities = function (citiesArray) {
        var cityData;
        citiesArray.forEach(function (cityName) {
            cityData = service.getCityData(cityName);
            service.addOtherCity(cityData);
        });
    };

    // Initialize axis and scales
    model.x = d3.scale.linear()
        .range([0, width]);

    model.xAxis = d3.svg.axis()
        .scale(model.x)
        .orient("top");

    // Start SVG
    model.svg = d3.select(container_selector).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    /* Initialize tooltip */
    model.tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([10, 0])
        .direction('s')
        .html(function (d) {
            var display10 = "?";
            if (d.pm10Mean) {
                display10 = d.pm10Mean;
            }
            var string = 'Country: ' + d.country + '</br>' +
                'PM2.5: ' + d['pm2.5Mean'] + '</br>' +
                'PM10: ' + display10;

            return string;
        });

    model.tip_selected_city = d3.tip()
        .attr('class', 'd3-tip')
        .offset([10, 0])
        .direction('s')
        .html(function (d) {
            var string = 'Country: ' + model.active_city_data.country + '</br>' +
                'PM2.5: ' + model.active_city_data['pm2.5Mean'] + '</br>' +
                'PM10: ' + model.active_city_data.pm10Mean;
            return string;
        });


    /* Invoke the tip in the context of your visualization */
    model.svg.call(model.tip);

    // g group for all of the chart elements
    model.lines = model.svg.append("g");
    model.active_city_g = model.svg.append("g");
    model.other_city_g = model.svg.append("g");

    // Start axis
    model.axis_element = model.svg.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", "translate(0,0)");

    model.buildGaugeBackground();

    // WHO Safe Level Line
    model.safe_level = model.lines.append("rect")
        .attr("x", 0)
        .attr("y", -20)
        .attr("height", (gauge_height + (20)))
        .attr("width", 2)
        .attr("fill", "black");
    // Add label
    model.safe_level_text = model.lines.append("text")
        .attr("class", "gauge-line-label")
        .attr("x", 0)
        .attr("y", ((gauge_label_spacing * -1) - 15))
        .style("text-anchor", "middle")
        .text("WHO Safe Level");


    model.updateVis = function () {

        model.other_cities = service.getOtherCities();


        model.x.domain([
            d3.min(model.data, function (d) {
                return d[model.selected_unit.key];
            }),
            d3.max(model.data, function (d) {
                return d[model.selected_unit.key];
            })
        ]);

        // Update guage body every time
        model.linear_guage_body
            .attr("width", model.x(d3.max(model.data, function (d) {
                return d[model.selected_unit.key];
            })))
            .attr("height", gauge_height)
            .style("fill", "url(#gradient)")
            .attr("stroke", "grey");


        // Data join
        model.other_city_lines = model.other_city_g.selectAll("rect")
            .data(model.other_cities, function (d) {
                return d.city + " " + d.country;
            });
        model.other_city_labels = model.other_city_g.selectAll("text")
            .data(model.other_cities, function (d) {
                return d.city + " " + d.country;
            });

        // Enter
        model.other_city_lines.enter().append("rect")
            .attr("x", function (d) {
                return model.x(d[model.selected_unit.key]);
            })
            .attr("y", 0)
            .attr("height", 0)
            .attr("width", 2)
            .attr("fill", "#666666")
            .on('mouseover', model.tip.show)
            .on('mouseout', model.tip.hide);

        model.other_city_labels.enter().append("text")
            .attr("class", "gauge-line-label")
            .attr("x", function (d) {
                return model.x(d[model.selected_unit.key]);
            })
            .attr("y", function (d, index) {
                return (gauge_height + (gauge_label_spacing * (index + 3)));
            })
            .style("text-anchor", "middle")
            .text(function (d) {
                return d.city;
            })
            .on('mouseover', model.tip.show)
            .on('mouseout', model.tip.hide);

        // Enter + update


        model.other_city_labels
            .transition()
            .duration(800)
            .attr("x", function (d) {
                return model.x(d[model.selected_unit.key]);
            })
            .text(function (d) {
                return d.city;
            })
            .attr("y", function (d, index) {
                return (gauge_height + (gauge_label_spacing * (index + 3)));
            });

        model.other_city_lines
            .transition()
            .duration(800)
            .attr("x", function (d) {
                return model.x(d[model.selected_unit.key]);
            })
            .attr("height", function (d, index) {
                return (gauge_height + (gauge_label_spacing * (index + 2)));
            });

        // Exit
        model.other_city_lines.exit().remove();
        model.other_city_labels.exit().remove();


        model.xAxis.scale(model.x);
        model.svg.select(".x-axis").transition().duration(1500).call(model.xAxis);

        // Update safe level line
        model.safe_level
            .transition()
            .duration(800)
            .attr("x", model.x(model.selected_unit.safe_level));

        // Update safe level text
        model.safe_level_text
            .transition()
            .duration(800)
            .attr("x", model.x(model.selected_unit.safe_level));

        if (service.getSelectedCity()) {

            // Update selected city
            model.active_city_data = [service.getSelectedCityData()];

            // Data join
            model.selected_city = model.active_city_g.selectAll("rect")
                .data(model.active_city_data, function (d) {
                    return d.city + " " + d.country;
                });
            model.selected_city_text = model.active_city_g.selectAll("text")
                .data(model.active_city_data, function (d) {
                    return d.city + " " + d.country;
                });

            // Enter
            model.selected_city.enter().append("rect")
                .attr("x", function (d) {
                    return model.x(d[model.selected_unit.key]);
                })
                .attr("y", 0)
                .attr("height", 0)
                .attr("width", 2)
                .attr("fill", "red")
                .on('mouseover', model.tip.show)
                .on('mouseout', model.tip.hide);

            model.selected_city_text.enter().append("text")
                .attr("class", "gauge-line-label")
                .attr("x", function (d) {
                    return model.x(d[model.selected_unit.key]);
                })
                .attr("y", function (d, index) {
                    return (gauge_height + (gauge_label_spacing * (index + 3)));
                })
                .style("text-anchor", "middle")
                .text(function (d) {
                    return d.city;
                })
                .on('mouseover', model.tip.show)
                .on('mouseout', model.tip.hide);

            // Update
            model.selected_city_text
                .transition()
                .duration(800)
                .attr("x", function (d) {
                    return model.x(d[model.selected_unit.key]);
                })
                .text(function (d) {
                    return d.city;
                })
                .attr("y", function (d, index) {
                    return (gauge_height + (gauge_label_spacing * (index + 2)));
                });

            model.selected_city
                .transition()
                .duration(800)
                .attr("x", function (d) {
                    return model.x(d[model.selected_unit.key]);
                })
                .attr("height", function (d, index) {
                    return (gauge_height + (gauge_label_spacing * (index + 1)));
                });

            // Exit
            model.selected_city.exit().remove();
            model.selected_city_text.exit().remove();

        }

        // Update other cities view
        model.updateOtherCitiesView();

    };

    model.unitSelectionListener = function () {
        $(document).ready(function () {
            $('#unit-selection-container .radio label input').click(function () {

                if (this.value === "unit-pm10") {
                    model.selected_unit = {key: "pm10Mean", safe_level: 25};
                } else {
                    model.selected_unit = {key: "pm2.5Mean", safe_level: 10};
                }
                model.updateVis();

            });
        });
    }();
    model.otherCityRemovalListener = function () {
        $(document).ready(function () {
            $("#other-selected-cities").on("click", ".remove-other-city", function () {
                var index = $(this).attr("data-index");
                service.removeOtherCity(index);
            });
        });
    }();

    // On constructor
    model.updateVis();

};

module.exports = airVisualization;

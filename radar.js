  // The MIT License (MIT)

  // Copyright (c) 2017 Zalando SE

  // Permission is hereby granted, free of charge, to any person obtaining a copy
  // of this software and associated documentation files (the "Software"), to deal
  // in the Software without restriction, including without limitation the rights
  // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  // copies of the Software, and to permit persons to whom the Software is
  // furnished to do so, subject to the following conditions:

  // The above copyright notice and this permission notice shall be included in
  // all copies or substantial portions of the Software.

  function radar_visualization(config) {
    console.log("Entries:", config.entries);
    const style = getComputedStyle(document.documentElement);

    config.svg_id = "radar";
    config.width = 1450;
    config.height = 900;
    config.font_family = "Raleway"
    config.colors = {
      background: style.getPropertyValue('--kleur-achtergrond'),
      text: style.getPropertyValue('--kleur-tekst'),
      grid: '#dddde0',
      inactive: "#ddd",
      hoog: style.getPropertyValue('--kleur-hoog'),
      midden: style.getPropertyValue('--kleur-midden'),
      laag: style.getPropertyValue('--kleur-laag')
    };
    config.quadrants = [
      { name: "Knelpunt leveranciers" }, //rechtsonder
      { name: "Routine leveranciers" }, //linksonder
      { name: "Hefboom leveranciers" }, //linksboven
      { name: "Strategische leveranciers" }, //rechtsboven
    ];

    config.rings = [
      { radius: 200, name: "Hoog", color: config.colors.hoog, textColor: "white" },
      { radius: 300, name: "Midden", color: config.colors.midden, textColor: "white" },
      { radius: 400, name: "Laag", color: config.colors.laag, textColor: "white" }
    ];

    config.print_layout = true;
    config.links_in_new_tabs = false;

    // custom random number generator, to make random sequence reproducible
    // source: https://stackoverflow.com/questions/521295
    var seed = 42;
    function random() {
      var x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    function random_between(min, max) {
      return min + random() * (max - min);
    }

    function normal_between(min, max) {
      return min + (random() + random()) * 0.5 * (max - min);
    }

    // radial_min / radial_max are multiples of PI
    const quadrants = [
      { radial_min: 0, radial_max: 0.5, factor_x: 1, factor_y: 1 }, //rechtsboven
      { radial_min: 0.5, radial_max: 1, factor_x: -1, factor_y: 1 }, //linksboven
      { radial_min: -1, radial_max: -0.5, factor_x: -1, factor_y: -1 }, //linksonder
      { radial_min: -0.5, radial_max: 0, factor_x: 1, factor_y: -1 } // rechtsonder
    ];

    const title_offset =
      { x: -675, y: -440 };

    const footer_offset =
      { x: -675, y: 420 };

    const legend_offset = [
      { x: 450, y: 90 }, //rechsonder
      { x: -675, y: 90 }, //linksonder
      { x: -675, y: -310 }, //linksboven
      { x: 450, y: -310 } //rechtsboven
    ];

    function polar(cartesian) {
      var x = cartesian.x;
      var y = cartesian.y;
      return {
        t: Math.atan2(y, x),
        r: Math.sqrt(x * x + y * y)
      }
    }

    function cartesian(polar) {
      return {
        x: polar.r * Math.cos(polar.t),
        y: polar.r * Math.sin(polar.t)
      }
    }

    function bounded_interval(value, min, max) {
      var low = Math.min(min, max);
      var high = Math.max(min, max);
      return Math.min(Math.max(value, low), high);
    }

    function bounded_ring(polar, r_min, r_max) {
      return {
        t: polar.t,
        r: bounded_interval(polar.r, r_min, r_max)
      }
    }

    function bounded_box(point, min, max) {
      return {
        x: bounded_interval(point.x, min.x, max.x),
        y: bounded_interval(point.y, min.y, max.y)
      }
    }

    function segment(quadrant, ring) {
      var polar_min = {
          t: quadrants[quadrant].radial_min * Math.PI,
          r: ring === 0 ? 30 : config.rings[ring - 1].radius // Gebruik config.rings
      };
      var polar_max = {
          t: quadrants[quadrant].radial_max * Math.PI,
          r: config.rings[ring].radius // Gebruik config.rings
      };
      var cartesian_min = {
          x: 15 * quadrants[quadrant].factor_x,
          y: 15 * quadrants[quadrant].factor_y
      };
      var cartesian_max = {
          x: config.rings[config.rings.length - 1].radius * quadrants[quadrant].factor_x, // Gebruik config.rings
          y: config.rings[config.rings.length - 1].radius * quadrants[quadrant].factor_y  // Gebruik config.rings
      };
      return {
          clipx: function(d) {
              var c = bounded_box(d, cartesian_min, cartesian_max);
              var p = bounded_ring(polar(c), polar_min.r + 15 + (d.circleSize || config.circleSize), polar_max.r - 15 - (d.circleSize || config.circleSize));
              d.x = cartesian(p).x; // Adjust data position
              return d.x;
          },
          clipy: function(d) {
              var c = bounded_box(d, cartesian_min, cartesian_max);
              var p = bounded_ring(polar(c), polar_min.r + 15 + (d.circleSize || config.circleSize), polar_max.r - 15 - (d.circleSize || config.circleSize));
              d.y = cartesian(p).y; // Adjust data position
              return d.y;
          },
          random: function() {
              return cartesian({
                  t: random_between(polar_min.t, polar_max.t),
                  r: normal_between(polar_min.r, polar_max.r)
              });
          }
      };
  }
      // position each entry randomly in its segment
    for (var i = 0; i < config.entries.length; i++) {
      var entry = config.entries[i];
      entry.segment = segment(entry.quadrant, entry.ring);
      var point = entry.segment.random();
      entry.x = point.x;
      entry.y = point.y;
      entry.color = entry.active || config.print_layout ?
        config.rings[entry.ring].color : config.colors.inactive;
      entry.textColor = config.rings[entry.ring].textColor;
    }

    // partition entries according to segments
    var segmented = new Array(4);
    for (var quadrant = 0; quadrant < 4; quadrant++) {
      segmented[quadrant] = new Array(config.rings.length);
      for (var ring = 0; ring < config.rings.length; ring++) {
        segmented[quadrant][ring] = [];
      }
    }
    for (var i=0; i<config.entries.length; i++) {
      var entry = config.entries[i];
      segmented[entry.quadrant][entry.ring].push(entry);
    }

    // assign unique sequential id to each entry
    var id = 1;
    for (var quadrant of [2,3,1,0]) {
      for (var ring = 0; ring < config.rings.length; ring++) {
        var entries = segmented[quadrant][ring];
        for (var i=0; i<entries.length; i++) {
          entries[i].id = "" + id++;
        }
      }
    }

    function translate(x, y) {
      return "translate(" + x + "," + y + ")";
    }


    var svg = d3.select("svg#" + config.svg_id)
      .style("background-color", config.colors.background)
      .attr("width", config.width)
      .attr("height", config.height);

    var radar = svg.append("g");
    radar.attr("transform", translate(config.width / 2, config.height / 2));

    var grid = radar.append("g");

    // draw grid lines
    grid.append("line")
      .attr("x1", 0).attr("y1", -400)
      .attr("x2", 0).attr("y2", 400)
      .style("stroke", config.colors.grid)
      .style("stroke-width", 2);
    grid.append("line")
      .attr("x1", -400).attr("y1", 0)
      .attr("x2", 400).attr("y2", 0)
      .style("stroke", config.colors.grid)
      .style("stroke-width", 2);

    // background color. Usage `.attr("filter", "url(#solid)")`
    // SOURCE: https://stackoverflow.com/a/31013492/2609980
    var defs = grid.append("defs");
    var filter = defs.append("filter")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 1)
      .attr("height", 1)
      .attr("id", "solid");
    filter.append("feFlood")
      .attr("flood-color", config.colors.text);
    filter.append("feComposite")
      .attr("in", "SourceGraphic");

    // draw rings
    for (var i = 0; i < config.rings.length; i++) {
      grid.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", config.rings[i].radius)
        .style("fill", "none")
        .style("stroke", config.colors.grid)
        .style("stroke-width", 2);
      if (config.print_layout) {
        grid.append("text")
          .text(config.rings[i].name)
          .attr("y", -config.rings[i].radius + 32)
          .attr("text-anchor", "middle")
          .style("fill", config.rings[i].color)
          .style("opacity", 0.75) //doorzichtigheid van de tekst in de ring
          .style("text-transform", "uppercase")
          .style("font-family", config.font_family)
          .style("font-size", "20px")
          .style("font-weight", "900")
          .style("pointer-events", "none")
          .style("user-select", "none");
      }
    }

    // function legend_transform(quadrant, ring, index=null) {
    //   var dx = ring < 2 ? 0 : 150; // ruimte tussen de legenda's
    //   var dy = (index == null ? -16 : index * 12);
    //   if (ring % 2 === 1) {
    //     dy = dy + 36 + segmented[quadrant][ring-1].length * 12;
    //   }
    //   return translate(
    //     legend_offset[quadrant].x + dx,
    //     legend_offset[quadrant].y + dy
    //   );
    // }

    function legend_transform(quadrant, ring, index = null) {
      const baseSpacing = 50; // Basisruimte tussen ringen
      const itemSpacing = 15; // Ruimte tussen items binnen een ring
      let dy = 0;
    
      // Voeg dynamische ruimte toe voor voorgaande ringen
      for (let r = 0; r < ring; r++) {
        const itemsInPreviousRing = segmented[quadrant][r].length; // Aantal items in de vorige ring
        dy += baseSpacing + itemsInPreviousRing * itemSpacing; // Basisruimte + ruimte per item
      }
    
      // Voeg ruimte toe voor items in de huidige ring
      if (index !== null) {
        dy += index * itemSpacing; // Stapel items binnen de ring
      } else {
        dy -= 20; // Optionele offset voor een label
      }
    
      return translate(
        legend_offset[quadrant].x, // Constante x-positie
        legend_offset[quadrant].y + dy // Dynamische y-positie
      );
    }
    
    

    // draw title and legend (only in print layout)
    if (config.print_layout) {

      // title
      radar
        .append("text")
        .attr("transform", translate(title_offset.x, title_offset.y + 20))
        .text(config.title || "")
        .style("font-family", config.font_family)
        .style("font-size", "14")
        .style("fill", config.colors.text)

      // footer
      radar.append("text")
        .attr("transform", translate(footer_offset.x, footer_offset.y))
        .text("■ nieuw ▲ verplaatst")
        .attr("xml:space", "preserve")
        .style("font-family", config.font_family)
        .style("font-size", "10px")
        .style("fill", config.colors.text);

      // legend
      var legend = radar.append("g");
      for (var quadrant = 0; quadrant < 4; quadrant++) {
        legend.append("text")
          .attr("transform", translate(
            legend_offset[quadrant].x,
            legend_offset[quadrant].y - 45
          ))
          .text(config.quadrants[quadrant].name)
          .style("font-family", config.font_family)
          .style("font-size", "20px")
          .style("font-weight", "900")
          .style("fill", config.colors.text);
        for (var ring = 0; ring < config.rings.length; ring++) {
          legend.append("text")
            .attr("transform", legend_transform(quadrant, ring))
            .text(config.rings[ring].name)
            .style("font-family", config.font_family)
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .style("fill", config.rings[ring].color);
          legend.selectAll(".legend" + quadrant + ring)
            .data(segmented[quadrant][ring])
            .enter()
              .append("a")
                .attr("href", function (d, i) {
                  return d.link ? d.link : "#"; // stay on same page if no link was provided
                })
                // Add a target if (and only if) there is a link and we want new tabs
                .attr("target", function (d, i) {
                  return (d.link && config.links_in_new_tabs) ? "_blank" : null;
                })
                // add application insights link clicked event
                .attr("onclick", function (d, i) {
                  return "if (appInsights) { appInsights.trackEvent('" + d.label + " clicked'); }";
                })
              .append("text")
                .attr("transform", function(d, i) { return legend_transform(quadrant, ring, i); })
                .attr("class", "legend" + quadrant + ring)
                .attr("id", function(d, i) { return "legendItem" + d.id; })
                .text(function(d, i) { 
                  // Define a function to truncate text to a maximum length
                  function truncateText(text, maxLength) {
                    if (text.length > maxLength) {
                      return text.substring(0, maxLength - 3) + "..."; // Subtract 3 for the ellipsis
                    } else {
                      return text;
                    }
                  }
                
                  const maxLength = 25; //maximale lengte van de tekst
                  const displayText = d.id + ". " + d.label;
                  return truncateText(displayText, maxLength);
                })
                .style("font-family", config.font_family)
                .style("font-size", "16px")
                .attr("fill", config.colors.text)
                .on("mouseover", function(d) { showBubble(d); highlightLegendItem(d); })
                .on("mouseout", function(d) { hideBubble(d); unhighlightLegendItem(d); });
        }
      }
    }

    // layer for entries
    var rink = radar.append("g")
      .attr("id", "rink");

    // rollover bubble (on top of everything else)
    var bubble = radar.append("g")
      .attr("id", "bubble")
      .attr("x", 0)
      .attr("y", 0)
      .style("opacity", 0)
      .style("pointer-events", "none")
      .style("user-select", "none");
    bubble.append("rect")
      .attr("rx", 4)
      .attr("ry", 4)
      .style("fill", config.colors.text);
    bubble.append("text")
      .style("font-family", config.font_family)
      .style("font-size", "15px")
      .style("font-weight", "bold")
      .style("fill", config.colors.background);
    bubble.append("path")
      .attr("d", "M 0,0 10,0 5,8 z")
      .style("fill", config.colors.text);

    function showBubble(d) {
      if (d.active || config.print_layout) {
        var tooltip = d3.select("#bubble text")
          .text(d.label); //hoover text
        var bbox = tooltip.node().getBBox();
        d3.select("#bubble")
          .attr("transform", translate(d.x - bbox.width / 2, d.y - 16))
          .style("opacity", 1);
        d3.select("#bubble rect")
          .attr("x", -5)
          .attr("y", -bbox.height)
          .attr("width", bbox.width + 10)
          .attr("height", bbox.height + 4);
        d3.select("#bubble path")
          .attr("transform", translate(bbox.width / 2 - 5, 3));
      }
    }

    function hideBubble(d) {
      var bubble = d3.select("#bubble")
        .attr("transform", translate(0,0))
        .style("opacity", 0);
    }

    function highlightLegendItem(d) {
      var legendItem = document.getElementById("legendItem" + d.id);
      legendItem.setAttribute("filter", "url(#solid)");
      legendItem.setAttribute("fill", config.colors.background);
    }

    function unhighlightLegendItem(d) {
      var legendItem = document.getElementById("legendItem" + d.id);
      legendItem.removeAttribute("filter");
      legendItem.setAttribute("fill", config.colors.text);
    }

    // draw blips on radar
    var blips = rink.selectAll(".blip")
      .data(config.entries)
      .enter()
        .append("g")
          .attr("class", "blip")
          .attr("transform", function(d, i) { return legend_transform(d.quadrant, d.ring, i); })
          .on("mouseover", function(d) { showBubble(d); highlightLegendItem(d); })
          .on("mouseout", function(d) { hideBubble(d); unhighlightLegendItem(d); });

    // configure each blip
    blips.each(function(d) {
      var blip = d3.select(this);

      // blip link
      if (d.active && d.hasOwnProperty("link") && d.link) {
        blip = blip.append("a")
          .attr("xlink:href", d.link);

        if (config.links_in_new_tabs) {
          blip.attr("target", "_blank");
        }
      }

      // blip shape
      if (d.status == 1) {
        blip.append("rect") //nieuw (vierkant)
        .attr("x", -7)       // x-coordinate of the top-left corner
        .attr("y", -6)       // y-coordinate of the top-left corner
        .attr("width", 15) 
        .attr("height", 15)
        .attr("fill", d.color);
      } else if (d.status == 2) {
        blip.append("path")
          .attr("d", "M -11,5 11,5 0,-13 z") // verplaatst (driehoek)
          .style("fill", d.color);
      } else {
        blip.append("circle")
          .attr("r", d.circleSize || config.circleSize)
          .attr("fill", d.color);
      }
      // blip text
      if (d.active || config.print_layout) {
        var blip_text = config.print_layout ? d.id : d.label.match(/[a-z]/i);
        blip.append("text")
        .text(blip_text)
        .attr("y", 3) // Houd de tekst gecentreerd
        .attr("text-anchor", "middle")
        .style("fill", d.textColor)
        .style("font-family", config.font_family)
        .style("font-weight", "bold")
        .style("font-size", config.circleSize)
        .style("pointer-events", "none")
        .style("user-select", "none");
      
      }
    });

    // make sure that blips stay inside their segment
    function ticked() {
      const margin = 15; // Basis marge van 10px
    
      blips.attr("transform", function(d) {
        // Controleer of de blip in ring 0 zit
        if (d.ring === 0) {
          // Pas marge aan afhankelijk van het kwadrant
          const quadrant = d.quadrant; // Zorg dat elke blip een quadrant-waarde heeft
    
          const xMargin = quadrant === 1 || quadrant === 3 ? margin : -margin; // Rechts positief, links negatief
          const yMargin = quadrant === 1 || quadrant === 3 ? margin : -margin; // Boven positief, onder negatief
    
          // Bereken de nieuwe coördinaten met marge
          const x = d.segment.clipx(d) + xMargin;
          const y = d.segment.clipy(d) + yMargin;
    
          return translate(x, y);
        }
    
        // Geen marge toepassen voor andere ringen
        return translate(d.segment.clipx(d), d.segment.clipy(d));
      });
    }
    
 
    // distribute blips, while avoiding collisions
    d3.forceSimulation()
    .nodes(config.entries)
    .force("collision", d3.forceCollide()
      .radius (31)
    )
    .on("tick", ticked);
  }
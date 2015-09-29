/* Utility functions */

var log = function (s) { console.log(s); };

Array.prototype.max = function () {
	var arr_copy = this.slice(0, this.length);
	return arr_copy.sort(function (a, b) { return a - b; })[this.length - 1];
};

Array.prototype.sum = function () {
	if (this.length > 1) return this.reduce(function (a, b) { return a + b; });
};


/* Parse data */

var seasons = Object.keys(counts).sort();

// Used for the bubble layout 
var bubble_data = {};
// Used for drawing arcs 
var arc_data = [];

// Aggregate counts
for (var season in counts) {
	for (var character in counts[season]) {
		if (!isNaN(parseInt(character))) delete counts[season][character];

		else {
			if (character in bubble_data) bubble_data[character] += counts[season][character];
			else bubble_data[character] = counts[season][character]

			arc_data.push({'character': character, 'season': season, 'count': counts[season][character]});
		}
	}
}

// List format
var character_list = [];
for (var character in bubble_data) character_list.push({'character': character, 'value': bubble_data[character]});

// Used for the chord diagram 
var matrix = [];
for (var i = 0; i < seasons.length; i++) {
	var s1 = seasons[i];
	var row = [];
	
	for (var j = 0; j < seasons.length; j++) {
		var s2 = seasons[j];

		if (s1 === s2) row.push(Object.keys(counts[s1]).map(function (k) { return counts[s1][k]; }).sum());
		else row.push(0);
	}

	matrix.push(row);
}

/* Globals */

// Dimensions of entire visualization 
var width = 650,
	height = 650;

// Dimensions for bubble layout
var bubbleD = 500,
	bubble_x_offset = width / 2.4,
	bubble_y_offset = height / 2.6;

// Dimensions for chord layout
var inner_radius = Math.min(width, height) * 0.41,
    outer_radius = inner_radius * 1.1;

// The bubble layout function 
var bubble = d3.layout.pack()
	.sort(null)
	.size([bubbleD, bubbleD])
	.padding(1.5);	// padding between circles 

// The chord layout (not a function)
var chord = d3.layout.chord()
	.padding(0.05)
	.sortSubgroups(d3.descending)
	.matrix(matrix);

// SVG where everything will be appended 
var svg = d3.select(".container").append("svg")
	.attr("width", width)
	.attr("height", height)
	.append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

// Chord arcs 
var chord_arc = svg.append("g").selectAll("path")
	.data(chord.groups)
	.enter()
	.append("path")
	.style("fill", "#fff")
	.attr("d", d3.svg.arc().innerRadius(inner_radius).outerRadius(outer_radius))
	.attr("id", function (d, i) { return 'season' + (i + 1) + '-arc'; });

// To show the chord layout dummy arcs 
// var clayoutarcs = svg.append("g")
//     .attr("class", "chord")
//   	.selectAll("path")
//     .data(chord.chords)
//     .enter().append("path")
//     .attr("d", d3.svg.chord().radius(inner_radius))
//     .style("fill", "black")
//     .style("opacity", 1);

// Bubble layout node 
var node = svg.selectAll(".node")
	.data(bubble.nodes({children: character_list}).filter(function (d) { return !d.children; }))	// ignore root node 
	.enter()
	.append('g')
	.attr('class', 'node')
	.attr('id', function (d) { return d.character + '-node'; })
	.attr('transform', function (d) { return "translate(" + (d.x - bubble_x_offset) + "," + (d.y - bubble_y_offset) + ")"; });

// The tooltip that appears upon hovering over the node 
node.append("title").text(function (d) { return d.character + ':' + d.value; });

// Radius of each node is proportional to the total # of times character has spoken 
node.append("circle")
	.attr("r", function (d) { return d.r; })
	.style("fill", "#fff").style("opacity", 0.9);


log(chord.groups());

/* 
	Constructs individual chord data objects for each character-to-season chord
	and arc segment. 
*/
var character_chords = function (counts) {
	var data = [];

	for (var season in counts) {
		// Select the arc corresponding to this season 
		var season_arc = d3.select("#" + season + "-arc").data()[0];

		// Calculate the total slice in radians this arc comprises of the chord diagram (always positive)
		var total_angle = season_arc.endAngle - season_arc.startAngle;

		// The total number of lines spoken in this season
		var total = season_arc.value;

		var curr_angle = season_arc.startAngle;

		for (var character in counts[season]) {

			// Find the start position (center of this character's bubble)
			var bubble = d3.select("#" + character + "-node").data()[0];
			var source = {x: bubble.x - bubble_x_offset, y: bubble.y - bubble_y_offset};
			
			// Calculate the slice this character takes up of the arc
			var count = counts[season][character];
			var perc = count / total;
			var angle = curr_angle + (perc * total_angle);

			// Calculate the start position 
			var x1 = inner_radius * Math.sin(curr_angle);
			var y1 = -1 * inner_radius * Math.cos(curr_angle);	// flip due to pixel coordinates

			// The end position
			var x2 = inner_radius * Math.sin(angle);
			var y2 = -1 * inner_radius * Math.cos(angle);

			var target1 = {x: x1, y: y1};
			var target2 = {x: x2, y: y2};

			data.push({'source': source, 'target': target1, 'character': character, 'season': season, value: count});
			data.push({'source': source, 'target': target2, 'character': character, 'season': season, value: count});

			// Increment the current angle
			curr_angle = angle;
		}
	}

	return data;
};

var diag = d3.svg.diagonal.radial();

// Links between bubbles and chord arcs 
var links_svg = svg.append("g").attr("class", "links");
var links = links_svg.selectAll("g.links").data(character_chords(counts)).enter();

// Add chord between bubble and arc segment and segment the 
// chord diagram arcs proportional to how many lines each 
// character takes up per season 
links.append("g")			// So we don't conflate with other paths 
	.attr("class", "radial")
	.append("path")
	.attr("id", function (d) { return d.character + '-' + d.season; })
	.attr("d", function (d) { 
		// Simulates a chord with two cubic bezier curves (diagonal radials).
		return diag(d); 
	})
	.style("stroke", "#fff")
	.style("fill", "none")
	.style("stroke-opacity", 0.2);



function update () {

}

// /* 
// 	TO DO 

// 	- on mouseover display info for character
// 		- name 
// 		- total count
// 		- some kind of visual breakdown by season (stacked bar?)

// 
/* Utility functions */

var log = function (s) { console.log(s); };

Array.prototype.max = function () {
	var arr_copy = this.slice(0, this.length);
	return arr_copy.sort(function (a, b) { return a - b; })[this.length - 1];
};

Array.prototype.sum = function () {
	if (this.length > 1) return this.reduce(function (a, b) { return a + b; });
};

d3.selection.prototype.moveToFront = function () {
  return this.each(function () { this.parentNode.appendChild(this); });
};

d3.selection.prototype.moveToBack = function () { 
    return this.each(function () { 
        var firstChild = this.parentNode.firstChild; 
        if (firstChild) this.parentNode.insertBefore(this, firstChild); 
    }); 
};


/* Parse data */

var seasons = Object.keys(counts).sort();

// Used for the bubble layout 
var bubble_data = {};

// Aggregate counts
for (var season in counts) {
	for (var character in counts[season]) {
		if (!isNaN(parseInt(character))) delete counts[season][character];

		else {
			if (character in bubble_data) bubble_data[character] += counts[season][character];
			else bubble_data[character] = counts[season][character]
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

// The chord layout object
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
	.attr("d", d3.svg.arc().innerRadius(inner_radius).outerRadius(outer_radius))
	.attr("id", function (d, i) { return 'season' + (i + 1) + '-arc'; })
	.style("fill", "#fff")
	.style("opacity", 0.2);

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
	.style("fill", "#fff")
	.style("opacity", 0.5);

// Interactive functionality for character bubble
node.on("mouseover", function (d) { d.over = true; highlight(d, d.character, seasons); })
	.on("mouseout", function (d) { d.over = false; highlight(d, d.character, seasons); });

// To generate a color scale for a given season
var color_scale = function (season, colors) {
	// The number of characters in this season
	var n = Object.keys(counts[season]).length;	
	// Color scale 
	return {scale: d3.scale.linear().domain([1, n]).range(colors), max: n};
};

// Season colors
var season_colors = {
	'season1': color_scale('season1', ['#000F2E', '#335CAD', '#47008F']),	// dark blue and purple
	'season2': color_scale('season2', ['#4C0000', '#E60000', '#B28F00']),	// red and hint of gold
	'season3': color_scale('season3', ['#142900', '#70944D']),				// green
	'season4': color_scale('season4', ['#333333', '#E6E6E6']),				// black and grey
	'season5': color_scale('season5', ['#3D0014', '#A31947']),				// burgundy/magenta reddish
	'season6': color_scale('season6', ['#523D00', '#E0C266']),				// gold
	'season7': color_scale('season7', ['#0F3D4C', '#85E0FF']) 				// blue 
};

/* Dynamically generate the data and visuals */

var diag = d3.svg.diagonal.radial();	// Generates path for cubic bezier curve
var arc = d3.svg.arc();					// Generates path for arc 

//	Constructs individual chord data objects for each character-to-season chord
//	and arc segment. 
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

			// Construct the chord datapoints (start and end)
			var datapoint = {
				'character': character,
				'season': season,
				'start': {'source': source, 'target': target1},
				'end': {'source': source, 'target': target2},
				'value': count,
				'startAngle': curr_angle,
				'endAngle': angle,
			};

			data.push(datapoint);

			// Increment the current angle
			curr_angle = angle;
		}

		//break;
	}

	return data;
};

// Links between bubbles and arcs 
var links_svg = svg.append("g").attr("class", "links");
var links = links_svg.selectAll("g.links").data(character_chords(counts)).enter();

// Add chord between bubble and arc segment and segment the 
// chord diagram arcs proportional to how many lines each 
// character takes up per season 
var link = links.append("g")			// So we don't conflate with other paths 
	.attr("class", "link")
	.append("path")
	.attr("id", function (d) { return d.character + '-' + d.season; })
	.attr("d", function (d) { 
		// Simulates a chord with two cubic bezier curves (diagonal radials)

		// The first curve path 
		var c1 = diag(d.start);	

		// The second curve path 
		var c2 = diag(d.end);

		// The arc path 
		var a = arc({startAngle: d.startAngle, endAngle: d.endAngle, innerRadius: inner_radius, outerRadius: outer_radius});

		// The line from the first curve endpoint to the top of the arc segment
		var l1 = 'L' + a.split('M')[1].split('A')[0];

		// The top arc and line down 
		var a1 = 'A' + a.split('A')[1];

		// We need to reverse the second curve path to start from the arc
		var cpoints = c2.replace('M', '').replace('C', ' ').split(' ').reverse();
		var c3 = 'C' + cpoints[1] + ' ' + cpoints[2] + ' ' + cpoints[3] + 'Z';
		
		var path = c1 + l1 + a1 + c3; 

		return path;
	});


// Function to highlight/unhighlight an arc/node or node/set of arcs
var highlight = function (d, character, seasons, arc) {
	var arc_opacity = d.over ? 0.8 : 0.3;
	var circle_opacity = d.over ? 0.9 : 0.5;
	var stroke_width = d.over ? 2 : 1;
	var circle_stroke_color = d.over ? 'black' : '#fff';
	var arc_stroke_color = d.over ? 'black' : 'none';

	if (!arc) {
		if (d.over) link.style("opacity", 0.05);
		else link.style("opacity", 0.3);
	}

	// Modify all arcs corresponding to character and season(s)
	var generator, color, a;
	for (var i = 0; i < seasons.length; i++) {
		// Grab a random color on the scale for this season
		generator = season_colors[seasons[i]];
		color = d.over ? generator.scale(Math.random() * generator.max) : '#fff';

		a = d3.select('#' + character + '-' + seasons[i]);
		a.style('opacity', arc_opacity).style('fill', color);//.style('stroke', arc_stroke_color);

		if (d.over) a.moveToFront();
		else a.moveToBack();
	}
	
	// Modify the bubble
	d3.select('#' + character + '-node').select("circle")
		.style('opacity', circle_opacity)
		.style('stroke', circle_stroke_color);

	if (d.over) node.moveToBack();
	else node.moveToFront();
};

// Function to highlight an arc and all its associated datapoints
var highlight_arc = function (d) {
	// Increase size of title 

	if (d.over) link.style("opacity", 0.05);
	else link.style("opacity", 0.3);

	// Highlight all links associated with this arc 
	for (var character in counts[d.season]) highlight(d, character, [d.season], true);

	if (d.over) node.moveToBack();
	else node.moveToFront();
};


// Style the inner arcs (links)
//link.style("stroke", "#fff")
link.style("fill", "#fff")
	.style("stroke-width", 1)
	.style("opacity", 0.3);

// Link hover functionality 
link.on("mouseover", function (d) { d.over = true; highlight(d, d.character, [d.season]); })
	.on("mouseout", function (d) { d.over = false; highlight(d, d.character, [d.season]); });


// Create text data for each season 
var text_data = [];
var a, s;
for (var i = 0; i < seasons.length - 1; i++) {
	// Calculate the arc length 
	a = d3.select("#" + seasons[i] + "-arc").data()[0];
	s = inner_radius * (a.endAngle - a.startAngle);

	text_data.push({
		x: (s / 2) - 15,
		href: '#' + seasons[i] + '-arc',
		id: 'season' + i + '-text',
		text: 'Season ' + seasons[i].replace('season', ''),
		season: seasons[i]
	});
}

// Render the season names 
svg.append("g").selectAll("text")
	.data(text_data)
	.enter()
	.append("text")
	.attr("x", function (d) { log(d.id); return d.x; })
	.attr("dy", -15)
	.append("textPath")
	.attr("class", "season-title")
	.attr("xlink:href", function (d) { return d.href; })
	.attr("id", function (d) { return d.id; })
	.text(function (d) { return d.text; })
	.on("mouseover", function (d, i) { d.over = true; highlight_arc(d); })
	.on("mouseout", function (d, i) { d.over = false; highlight_arc(d); });


// Bring all the bubbles to the front 
node.moveToFront();

/* 
	TO DO 
	- individual character tooltips
	- make non-highlighted stuff all but disappear

	- useful: http://www.brightpointinc.com/interactive/political_influence/index.html
*/

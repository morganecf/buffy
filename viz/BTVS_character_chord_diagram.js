/* Utility functions */
// Array.prototype.max = function () {
// 	var arr_copy = this.slice(0, this.length);
// 	return arr_copy.sort(function (a, b) { return a - b; })[this.length - 1];
// };

/* Parse data */

// Used for the bubble layout 
var bubble_data = {};
for (var season in counts) {
	for (var character in counts[season]) {
		if (character in bubble_data) bubble_data[character] += counts[season][character];
		else bubble_data[character] = counts[season][character]
	}
}

var character_list = [];
for (var character in bubble_data) character_list.push({'character': character, 'value': bubble_data[character]});

//var max_count = character_list.map(function (c) { return c.count; }).max();

/* Globals */

// Dimensions of entire visualization 
var width = 700,
	height = 700;

// Dimensions for bubble layout
var bubbleD = 600;

// The bubble layout function 
var bubble = d3.layout.pack()
	.sort(null)
	.size([bubbleD, bubbleD])
	.padding(1.5);	// padding between circles 

// SVG where everything will be appended 
var svg = d3.select(".container").append("svg")
	.attr("width", width)
	.attr("height", height);

// Bubble layout node 
var node = svg.selectAll(".node")
	.data(bubble.nodes({children: character_list}).filter(function (d) { return !d.children; }))	// ignore root node 
	.enter()
	.append('g')
	.attr('class', 'node')
	.attr('transform', function (d) { return "translate(" + d.x + "," + d.y + ")"; });

// The tooltip that appears upon hovering over the node 
node.append("title").text(function (d) { return d.character + ':' + d.value; });

// Radius of each node is proportional to the total # of times character has spoken 
node.append("circle")
	.attr("r", function (d) { return d.r; })
	.style("fill", "pink");

function update () {

}
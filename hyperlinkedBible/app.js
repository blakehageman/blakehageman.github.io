//remap links into parallel arrays to allow for basic array functionality
const linksFrom = links.map(d => {
        return d['VerseID']
    });
const linksTo = links.map(d => {
    return d['VerseRefID']
});

// node data grouped into height=3 d3.hierarchy for multilevel data access
let data = d3.nest()
    .key(function(d) { return d.BookID; })
    .key(function(d) { return d.ChapterID;})
    .entries(nodes)
    .map(d => {
        d.values = d.values.map(s => {
            return {
                name: s.key,
                children: s.values 
            } 
        });
        return {
            name: d.key,
            children: d.values 
        } 
    });

data = {
    "name":"root",
    "children":data
}
let root = d3.hierarchy(data);

d3.select(".loading").remove();

//global vars
const width = 1200;
const height = 500;
const margin = 14;
const head = 8;
const rows = 130;
const cols = 339;
const rw = ((width-2*margin)/cols);
const rh = ((height-3*margin-head)/rows);
const r1 = 1.9;
const r2 = 1.3;
const r3 = 0.8;

//build basic DOM for viz
const svg = d3.select("#chartContainer")
            .append("svg")
            .attr("id", "chart")
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("align","center");

const div = d3.select("body").append("div")	
            .attr("class", "tooltip")
            .style("opacity", 0);

const l = svg.append("g")
            .attr("class", "links");

const g = svg.append("g")
            .attr("class", "nodes");

const defs = svg.append("g")
            .attr("class", "defs");

const verse_p = document.getElementById("verse");

//create nodes with depth-first preOrder traversal
let row_length = 0;
let row_i = 0;
let str = '';
let xc = margin;
let yc = margin + head;
let xdisp = 0;
let total = 0;
let count=0;
let flag = false;

root.eachBefore(d => {
    if (d.depth == 1) {
        if (row_length==0) {
            xc += (row_length + 0.5)*rw;
        }
        else {
            xc += (row_length + 1)*rw;
        }
        row_length = Math.ceil(d.count().value/rows);
        total += row_length; //variable to find number of columns based on rows/gaps
        flag=false; //reset flag to indicate start of new book/block
    }
    if (d.depth>0) {
        return g.append("circle")
            .attr("class", () => {
                toReturn = "num"+count;
                count++;
                if (d.depth == 1) {
                    return `d${d.depth} b${d.data['name']} ${toReturn}`;
                }
                else if (d.depth == 2) {
                    return `d${d.depth} b${d.parent.data['name']} c${d.data['name']} ${toReturn}`;
                }
                else {
                    return `d${d.depth} b${d.parent.parent.data['name']} c${d.parent.data['name']} ${toReturn}`;
                }
            })
            .attr("id", () => {
                if (d.depth == 1) {
                    str = "b" + d.data['name'];
                }
                else if (d.depth == 2) {
                    str = `b${d.parent.data['name']}c${d.data['name']}`
                }
                else {
                    str = "v"+d.data['VerseID'];
                }
                return str;
            })
            .attr("cx", () => {
                if (row_i%row_length==0) {
                    row_i=0;
                    if (flag == true) {
                        yc += rh;
                    }
                }
                if (d.depth == 1) {
                    row_i=0;
                    yc = margin + head;
                    return xc + ((row_length-1)*rw)/2;
                }
                else if (d.depth == 2 | d.depth == 3) {
                    xdisp = row_i*rw;
                    row_i++;
                    flag = true;
                    return xc + xdisp;
                }
                else {
                    console.log(`cx value error at ${d.data['name']}`)
                    return 0;
                }
            })
            .attr("cy", () => {
                if (d.depth == 1) {
                    return margin;
                }
                else if (d.depth == 2 | d.depth == 3) {
                    return yc;
                }
                else {
                    console.log(`cy value error at ${d.data['name']}`)
                    return 0;
                }
            })
            .attr("r", () => {
                if (d.depth == 1) {
                    return r1;
                }
                else if (d.depth == 2) {
                    return r2;
                }
                else if (d.depth == 3) {
                    return r3;
                }
                else {
                    console.log(`r value error at ${d.data['name']}`)
                    return 0;
                }
            })
    }
    else {
        return;
    }
});

//select circles for updates below
const circles = d3.selectAll("circle");

let circleCoords = [];
circles.each(function(d, i) {
    circleCoords.push({
        x: d3.select(this).attr("cx"),
        y: d3.select(this).attr("cy"),
        id: i
    })
});

//update circles with onclick selection behavior
circles.each(function () {
    //console.log(d3.select(this).depth)
    regex_v = /[0-9]+/;
    regex_d = /d[0-9]+/;
    depth = parseInt(d3.select(this).attr("class").match(regex_d)[0][1]);
    if (depth<3) {
        regex_bc = /b[0-9]+( c[0-9]+)?/;
        split = d3.select(this).attr("class").match(regex_bc)[0].split(" ");
        b = split[0];
        if (split[1]) {
            c = split[1];
            classAttr = `.${b}.${c}`;
        }
        else {
            classAttr = `.${b}`;
        }
        d3.select(this).attr("name", classAttr);
        //console.log(classAttr);
        d3.select(this).on("click", () => {
            classAttr = d3.select(this).attr("name");
            d3.selectAll(classAttr).classed("selection", !d3.selectAll(classAttr).classed("selection"));
            redrawLinks();
            updateText();
        });
    }
    else {
        d3.select(this).on("click", () => {
            //toggle selection class
            d3.select(this).classed("selection", !d3.select(this).classed("selection"));
            redrawLinks();
            updateText();
        });
    }
});

//update circles with hover tooltip behavior
circles.each(function() {
    let tooltext = "default";
    if (d3.select(this).attr("class").includes("d1")) {
        rx = /[0-9]+/; //finds book number
        index = parseInt(d3.select(this).attr("id").match(rx)); 
        tooltext = getBook(index);
    }
    else if (d3.select(this).attr("class").includes("d2")) {
        rx = /[0-9]+/; //finds book number
        rx2 = /[0-9]+$/m; //finds chapter number
        book = parseInt(d3.select(this).attr("id").match(rx)); 
        chapter = parseInt(d3.select(this).attr("id").match(rx2));
        tooltext = getBook(book) + " " + chapter;
    }
    else if (d3.select(this).attr("class").includes("d3")){
        rx = /[0-9]+/; //finds verse number
        verse = parseInt(d3.select(this).attr("id").match(rx)); 
        verseInfo = getVerse(verse);
        OsisRef = verseInfo[0].split(".");
        tooltext = `${getBook(OsisRef[0])} ${OsisRef[1]}:${OsisRef[2]}`;
    }
    d3.select(this)
        .on("mouseover", function() {		
            div.transition()	
                .delay(500)	
                .duration(200)		
                .style("opacity", .9);		
            div.html(tooltext)
                .style("left", (d3.event.pageX - 70) + "px")		
                .style("top", (d3.event.pageY - 30) + "px");	
            })					
        .on("mouseout", function(d) {		
            div.transition()		
                .duration(200)		
                .style("opacity", 0);	
    });
});

//add reset button functionality
const reset = d3.select("#reset")
    .on("click",function() {
        d3.selectAll(".selection").classed("selection", false);
        redrawLinks();
        updateText();
    });

//add popup/modal button functionality
let modal = document.getElementById("modal");
let btn = document.getElementById("popup");
let span = document.getElementsByClassName("close")[0];

btn.onclick = function() {
  modal.style.display = "block";
}

span.onclick = function() {
  modal.style.display = "none";
}

window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}


//functions used above
function redrawLinks() {
    d3.selectAll("path.line").remove();
    d3.selectAll(".endpoints").remove();

    return d3.selectAll(".d3.selection").each(function() {
        toDraw = [];
        regex_v = /[0-9]+/;
        verseID = parseInt(d3.select(this).attr("id").match(regex_v));

        //build array of VerseNums to draw from/to
        indexes = getAllIndexes(linksFrom, verseID);
        indexes.forEach(i => {
            toDraw.push([linksFrom[i], linksTo[i]]);
        });

        //draw lines
        toDraw.forEach(d => {
            //d[0] = fromVerseNum, d[1] = toVerseNum
            x1 = d3.select(`#v${d[0]}`).attr("cx");
            y1 = d3.select(`#v${d[0]}`).attr("cy");
            x2 = d3.select(`#v${d[1]}`).attr("cx");
            y2 = d3.select(`#v${d[1]}`).attr("cy");
            l.append("path")
                .attr("d", `
                    M${x1},${y1} 
                    L${x2},${y2} 
                `)
                .attr("class", "line");
            g.append("circle")
                .attr("class", "endpoints")
                .attr("cx", x2)
                .attr("cy", y2)
                .attr("r", r3);

        });
    });

};

function updateText() {
    text = "";
    if (d3.selectAll(".d1.selection").size() > 0) { //book group selection
        d3.selectAll(".d1.selection").each(function() {
            rx = /[0-9]+/; //finds book number
            index = parseInt(d3.select(this).attr("id").match(rx)); 
            if (text.length===0) {
                text = getBook(index);
            }
            else {
                text = text + ", " + getBook(index);
            }
        });
    }
    else if (d3.selectAll(".d2.selection").size() > 0) { //chapter group selection
        d3.selectAll(".d2.selection").each(function() {
            rx = /[0-9]+/; //finds book number
            rx2 = /[0-9]+$/m; //finds chapter number
            book = parseInt(d3.select(this).attr("id").match(rx)); 
            chapter = parseInt(d3.select(this).attr("id").match(rx2));
            if (text.length===0) {
                text = getBook(book) + " " + chapter;
            }
            else {
                text = text + ", " + getBook(book) + " " + chapter;
            }
        });
    }
    else if (d3.selectAll(".d3.selection").size() > 0) { //verses selected only
        d3.selectAll(".d3.selection").each(function() {
            rx = /[0-9]+/; //finds verse number
            verse = parseInt(d3.select(this).attr("id").match(rx)); 
            verseInfo = getVerse(verse);
            OsisRef = verseInfo[0].split(".");
            verseText = verseInfo[1];
            if (text.length===0) {
                text = `${getBook(OsisRef[0])} ${OsisRef[1]}:${OsisRef[2]} KJV: ${verseText}`;
            }
            else {
                text = text + "<br>"+ `${getBook(OsisRef[0])} ${OsisRef[1]}:${OsisRef[2]} KJV: ${verseText}`;
            }
        });
    }
    else { //no selection
        text = "click on a node"
    }
    verse_p.innerHTML = text;
    //return d3.select("#verse")
        //.text(text)
}

function getBook(key) {
    toReturn = '';
    books.forEach(function(d) {
        if (d['bookNum']===key|d['osis']===key) {
            toReturn = d['bookName'];
        }
    });
    return toReturn;
}

function getVerse(key) { //O(n) version... should be implemented as a binary search since list is sorted
    toReturn = [];
    nodes.forEach(function(d) {
        if (d['VerseID']===key) {
            toReturn.push(d['OsisRef']);
            toReturn.push(d['VerseText']);
        }
    });
    return toReturn;
}

function getAllIndexes(arr, val) { //O(n) version... should be implemented as a binary search since list is sorted
    var indexes = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
}

function polygon(d) {
    return 'M' + d.join('L') + 'Z';
  }

//print cols, given rows
// console.log(total+65);
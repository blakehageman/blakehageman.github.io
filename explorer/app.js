//init mapbox libs and objs
mapboxgl.accessToken = 'pk.eyJ1IjoiYmxha2VqaGFnZW1hbiIsImEiOiJja2U4dDI5bzIyMDhpMnNwOGJtNmY5dDQwIn0.x8GDIyus0MyMBI22xC5eVw';

//set up map
let mapboxClient = mapboxSdk({accessToken: mapboxgl.accessToken});
let map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/blakejhageman/ckiv72p683dy319qj9nfncbq3',
  center: [-87.6, 41.8], // starting position [lng, lat]
  zoom: 0, // starting zoom
  maxBounds: [ //bounding box limits to US
    [-126.5, 22], //southwest coordinates
    [-65.5, 51] //northeast coordinates
  ] 
});
map.on('load', function () {
  //resize map to div container
  map.resize();
  map.addSource('mapbox-dem', {
    'type': 'raster-dem',
    'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
    'tileSize': 512,
    'maxzoom': 14
    });
    // add the DEM source as a terrain layer with exaggerated height
    map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.0 });

    // add a sky layer that will show when the map is highly pitched
    map.addLayer({
    'id': 'sky',
    'type': 'sky',
    'paint': {
    'sky-type': 'atmosphere',
    'sky-atmosphere-sun': [0.0, 0.0],
    'sky-atmosphere-sun-intensity': 15
    }
  });
});

//add geocoder functionality
let geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    countries: 'us',
    mapboxgl: mapboxgl,
    marker: false,
    flyTo: false
  });
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));
geocoder.on("result", response => {
  let lnglat = new mapboxgl.LngLat(response.result.center[0], response.result.center[1]);
  point.setLngLat(lnglat).addTo(map);
  updateLocation(response);
  toggleDashboardOnSearch(response);
  map.flyTo({
    center: [
      lnglat.lng,
      lnglat.lat
    ],
    zoom:12,
    speed: 2,
    maxDuration: 2000,
    essential: true
  });
  setTimeout(function(){updateOnFlyTo(lnglat)}, 2001);
});

function updateOnFlyTo(lnglat) {
  updateDashboard(map.project(lnglat));
  updateMap(map.project(lnglat));
}

//on click, return data at point
let point = new mapboxgl.Marker(buildMarker());
map.on('click', function(e) {
  //add marker to map and return location/address at point
  point.setLngLat(e.lngLat).addTo(map);  
  mapboxClient.geocoding.reverseGeocode({
    query: [e.lngLat.lng, e.lngLat.lat],
    types: ["region", "postcode", "address"]
  })
    .send()
    .then(response => {
      updateLocation(response);
      toggleDashboardOnClick(response);
    });
  updateDashboard(e.point);
  updateMap(e.point);

});

//add reset button functionality
const reset = d3.select("#reset")
  .on("click",function() {
    //clear dashboard
    document.getElementById("content").style.visibility="collapse";
    document.getElementById("welcome").style.visibility="visible";
    
    //clear area selection
    const toggle1 = 'zip-highlighted';
    const toggle2 = 'zip-highlighted-fill';
    map.setLayoutProperty(toggle1, 'visibility', 'none');
    toggle1.className = '';
    map.setLayoutProperty(toggle2, 'visibility', 'none');
    toggle2.className = '';

    //clear marker
    d3.selectAll(".marker").remove();
  });

const zoom = d3.select("#zoom")
  .on("click",function() {
    map.flyTo({
      center: [
      point.getLngLat().lng,
      point.getLngLat().lat
    ],
    zoom:12,
    essential: true // this animation is considered essential with respect to prefers-reduced-motion
    });
  });

function toggleDashboardOnClick(response) {
  //console.log(response);
  if (response.body.features.length <= 1) { //if features.length <= 1, no address found at point
    //display welcome page on dashboard
    document.getElementById("content").style.visibility="collapse";
    document.getElementById("welcome").style.visibility="visible";
  }
  else {
    //display data for point
    document.getElementById("welcome").style.visibility="collapse";
    document.getElementById("content").style.visibility="visible";
  }
}

function toggleDashboardOnSearch(response) {
  //console.log(response);
  if (!response.result.place_name) { //no location found
    //display welcome page on dashboard
    document.getElementById("content").style.visibility="collapse";
    document.getElementById("welcome").style.visibility="visible";
  }
  else {
    //display data for point
    document.getElementById("welcome").style.visibility="collapse";
    document.getElementById("content").style.visibility="visible";
  }
}

function updateDashboard(point) {
  options = {
    layers: [
      "census-data-by-zip",
      "shipping-centers",
      "natural-hazards",
      "nata-health-index",
      "environmental-quality-index",
      "climate-normals"
    ]
  }
  //return feature data at point
  var features = map.queryRenderedFeatures(point, options);

  var displayProperties = [
    'type',
    'properties',
    'id',
    'layer',
    'source',
    'sourceLayer',
    'state'
  ];
    
  var displayFeatures = features.map(function (feat) {
    var displayFeat = {};
    displayProperties.forEach(function (prop) {
      displayFeat[prop] = feat[prop];
    });
    return displayFeat;
  });

  //do stuff with feature data
  console.log(displayFeatures);

  if (displayFeatures.length==0) {
    //no data for selection error
  }
  displayFeatures.forEach(function (dataset) {
    //do stuff
      if (dataset.layer.id==="census-data-by-zip") {
        let properties = dataset["properties"];
        document.getElementById("current-zip").textContent=`Showing data for ZIP ${properties["GEOID10"]}`;
        let charts = [
          "population-age",
          "population-density",
          "housing-units",
          "housing-typology",
          "housing-age",
          "housing-value",
          "ownership-rate",
          "ownership-SMOC",
          "ownership-rent",
          "ownership-vacancy",
          "utilities-internet",
          "utilities-heating",
          "transportation-commute",
          "transportation-means",
          "transportation-vehicles"
        ]
        charts.forEach(d => buildChart(d, properties));
      }
      else if(dataset.layer.id==="shipping-centers") {
        buildChart("transportation-shipping", dataset["properties"]);
      }
      else if(dataset.layer.id==="natural-hazards") {
        buildChart("environment-hazards", dataset["properties"]);
      }
      else if(dataset.layer.id==="environmental-quality-index") {
        buildChart("environment-eqi", dataset["properties"]);
      }
      else if(dataset.layer.id==="nata-health-index") {
        buildChart("environment-nata", dataset["properties"]);
      }
      else if(dataset.layer.id==="climate-normals") {
        buildChart("environment-climate", dataset["properties"]);
      }
  });
}

function updateMap(point) {
  options = {
    layers: ["census-data-by-zip"]
  }
  const toggle1 = 'zip-highlighted';
  const toggle2 = 'zip-highlighted-fill';

  //return feature data at point
  var features = map.queryRenderedFeatures(point, options);

  var filter = features.reduce(
    function (memo, feature) {
      memo.push(feature.properties.GEOID10);
      return memo;
    },
    ['in', 'GEOID10']
  );

  map.setFilter(toggle1, filter);
  map.setFilter(toggle2, filter);

  // toggle layer visibility by changing the layout object's visibility property
  if (features.length===0) {
    map.setLayoutProperty(toggle1, 'visibility', 'none');
    toggle1.className = '';
    map.setLayoutProperty(toggle2, 'visibility', 'none');
    toggle2.className = '';
  }
  else {
    toggle1.className = 'active';
    map.setLayoutProperty(toggle1, 'visibility', 'visible');
    toggle2.className = 'active';
    map.setLayoutProperty(toggle2, 'visibility', 'visible');
  }
}

function updateLocation(response) {
  //update current address variable
  let match;
  if (response.body) {
    match = response.body.features;
    currentAddress = match[0]['place_name'];
  }
  else {
    match = response.result;
    currentAddress = match['place_name'];
  }

  //update sidebar display;
  document.getElementById("display-text").textContent=currentAddress;
}

function buildMarker() {
  let custom_marker = document.createElement('div');
  custom_marker.className='marker';
  custom_marker.style.width = '24px';
  custom_marker.style.height = '38px';
  custom_marker.style.background = 'url(assets/marker.svg)';
  return {
    element: custom_marker,
    anchor: "bottom"
  };
}

function buildChart(type, data) {
  // console.log("Input data:")
  //console.log(data);

  //chart template variables
  let height = 200;
  let width = document.getElementById("content").clientWidth;
  let margin = ({top: 10, right: 0, bottom: 40, left: 20})
  let population, units, area_sm, area_acre;
  let color = "rgb(20,20,20)";

  //switch case for chart type
  switch(type) {
    case "population-age":
      //extract relevant data
      age_data = [];
      Object.keys(data).forEach(function(prop) {
        if (prop.includes("%POP")) {
          age = prop.split("_")[1];
          if (age.includes("-")) {
            age_data.push(
              {
                "age_low":age.split("-")[0],
                "age_high":age.split("-")[1],
                "age":`${age.split("-")[0]}-${age.split("-")[1]}`,
                "pct":data[prop]
              });
          }
          else { //special case for 85+
            age_data.push(
              {
                "age_low":age.split("+")[0],
                "age_high":"",
                "age":age,
                "pct":data[prop]
              });
          }
        }
      });
      //sort array by low bound due to autosorting of JSON keys above
      age_data.sort((a, b) => parseInt(a["age_low"])-parseInt(b["age_low"]));

      //d3 bar chart
      d3.select("#pop-age-chart").remove()

      const pop_age_svg = d3.select("#population-age")
        .append("svg")
        .attr("id","pop-age-chart")
        .attr("class","chart")
        .attr("viewBox", [0, 0, width, height]);

      xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(i => age_data[i].age).tickSizeOuter(0))

      yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(null, data.format))
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(data.y))

      x = d3.scaleBand()
        .domain(d3.range(age_data.length))
        .range([margin.left, width - margin.right])
        .padding(0.1)

      y = d3.scaleLinear()
        .domain([0, d3.max(age_data, d => d.pct)]).nice()
        .range([height - margin.bottom, margin.top])

      pop_age_svg.append("g")
        .attr("fill", color)
        .selectAll("rect")
        .data(age_data)
        .join("rect")
          .attr("x", (d, i) => x(i))
          .attr("y", d => y(d.pct))
          .attr("height", d => y(0) - y(d.pct))
          .attr("width", x.bandwidth());

      pop_age_svg.append("g")
        .call(xAxis)
        .selectAll("text")
        .attr("transform",`rotate(45), translate(${x.bandwidth()},0)`);
  
      pop_age_svg.append("g")
        .call(yAxis)
      break;
    case "population-density":
      for (var prop in data) {
        if (!data.hasOwnProperty(prop)) {
            //skip prototype properties
            continue;
        }
        if (prop==="POP_TOT") {
          population = data[prop];
        }
        if (prop==="ALAND10") {
          area_sm = data[prop];
        }
      }
      area_acre = Math.ceil(area_sm/4046.86);
      let pop_density = (population/area_acre);

      //d3 chart
      if (!isNaN(pop_density)) {
        document.getElementById("population-density-data").textContent=`${pop_density.toFixed(2)}`;
        document.getElementById("population-total-data").textContent=`${population.toFixed(0)}`;
      }
      else {
        document.getElementById("population-density-data").textContent=`ERROR`;
        document.getElementById("population-total-data").textContent=`ERROR`;
      }
      break;
    case "housing-units":
      for (var prop in data) {
        if (!data.hasOwnProperty(prop)) {
            //skip prototype properties
            continue;
        }
        if (prop==="TOT_UNITS") {
          units = data[prop];
        }
        if (prop==="ALAND10") {
          area_sm = data[prop];
        }
      }
      area_acre = Math.ceil(area_sm/4046.86);
      let unit_density = (units/area_acre);

      //d3 chart
      if (!isNaN(unit_density)) {
        document.getElementById("housing-units-data").textContent=`${unit_density.toFixed(2)}`;
        document.getElementById("housing-total-data").textContent=`${units.toFixed(0)}`;
      }
      else {
        document.getElementById("housing-units-data").textContent=`ERROR`;
        document.getElementById("housing-total-data").textContent=`ERROR`;
      }
      break;
    case "housing-typology":
      //extract relevant data
      typology_data = [];
      Object.keys(data).forEach(function(prop) {
        if (prop.includes("%TYP")) {
          typology = prop.split("_")[1];
          switch(typology) {
            case "1DET":
              typology_data.push(
                {
                  "index":0,
                  "typology":"Single Family, Detached",
                  "pct":data[prop]
                });
              break;
            case "1ATT":
              typology_data.push(
                {
                  "index":1,
                  "typology":"Single Family, Attached",
                  "pct":data[prop]
                });
              break;
            case "2":
              typology_data.push(
                {
                  "index":2,
                  "typology":"Multifamily, 2 units",
                  "pct":data[prop]
                });
              break;
            case "3-4":
              typology_data.push(
                {
                  "index":3,
                  "typology":"Multifamily, 3-4 units",
                  "pct":data[prop]
                });
              break;
            case "5-9":
              typology_data.push(
                {
                  "index":4,
                  "typology":"Multifamily, 5-9 units",
                  "pct":data[prop]
                });
              break;
            case "10-19":
              typology_data.push(
                {
                  "index":5,
                  "typology":"Multifamily, 10-19 units",
                  "pct":data[prop]
                });
              break;
            case "20+":
              typology_data.push(
                {
                  "index":6,
                  "typology":"Multifamily, 20+ units",
                  "pct":data[prop]
                });
              break;
            case "MOBIL":
              typology_data.push(
                {
                  "index":7,
                  "typology":"Mobile Homes",
                  "pct":data[prop]
                });
              break;
            case "VEHIC":
              typology_data.push(
                {
                  "index":8,
                  "typology":"Other",
                  "pct":data[prop]
                });
              break;
          }
        }
      });
      typology_data.sort((a, b) => a["index"]-b["index"]);
      //console.log(typology_data);

      //d3 chart
      d3.selectAll("ul.housing").remove();

      list = d3.selectAll("#housing-typology")
        .append("ul")
        .attr("class","housing")
        .attr("id","housing-typology-list");

      chart_width = document.getElementById("housing-typology-list").clientWidth;

      typology_data.forEach(function (d) {
        list.append("li")
          .attr("class","typology-li-"+d["index"])
          .append("span")
            .attr("class","span-left")
            .style("flex","auto")
            .text(d["typology"]);

        d3.selectAll(".typology-li-"+d["index"])
          .append("span")
            .attr("class","span-right")
            .text(d["pct"].toFixed(1)+"%");

        g = d3.selectAll(".typology-li-"+d["index"])
          .append("svg")
          .attr("width",chart_width)
          .attr("height", 8)
          .style("margin", "4px 0 4px 0")
          .append("g")
        
        g.append("rect")
            .attr("fill",color)
            .attr("height", 8)
            .attr("width", chart_width*d["pct"]/100);

        g.append("rect")
          .attr("fill","rgb(223, 223, 223)")
          .attr("x", chart_width*d["pct"]/100)
          .attr("height", 10)
          .attr("width", chart_width-(chart_width*d["pct"]/100));
      });

      break;
    case "housing-age":
      //extract relevant data
      age_data = [];
      Object.keys(data).forEach(function(prop) {
        if (prop.includes("%YR")) {
          year = prop.split("_")[1];
          if (year.includes("s")) {
            age_data.push(
              {
                "year":parseInt(year.substring(0,4)),
                "decade":year,
                "pct":data[prop]
              });
          }
          else if (year.includes("B4")) {
            age_data.push(
              {
                "year":parseInt(year.substring(2,6)),
                "decade": "<1940",
                "pct":data[prop]
              });
          }
          else if (year.includes("2")) {
            age_data.push(
              {
                "year":parseInt(year.substring(0,4)),
                "decade": ">2010",
                "pct":data[prop]
              });
          }
        }
      });
      //sort array by low bound due to autosorting of JSON keys above
      age_data.sort((a, b) => a["year"]-b["year"]);
      age_data[8].pct = age_data[8].pct + age_data[9].pct;
      age_data.pop();

      //d3 bar chart
      d3.select("#housing-age-chart").remove()

      const housing_age_svg = d3.select("#housing-age")
        .append("svg")
        .attr("id","housing-age-chart")
        .attr("class","chart")
        .attr("viewBox", [0, 0, width, height]);

      xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(i => age_data[i].decade).tickSizeOuter(0))

      yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(null, data.format))
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(data.y))

      x = d3.scaleBand()
        .domain(d3.range(age_data.length))
        .range([margin.left, width - margin.right])
        .padding(0.1)

      y = d3.scaleLinear()
        .domain([0, d3.max(age_data, d => d.pct)]).nice()
        .range([height - margin.bottom, margin.top])

      housing_age_svg.append("g")
        .attr("fill", color)
        .selectAll("rect")
        .data(age_data)
        .join("rect")
          .attr("x", (d, i) => x(i))
          .attr("y", d => y(d.pct))
          .attr("height", d => y(0) - y(d.pct))
          .attr("width", x.bandwidth());

      housing_age_svg.append("g")
        .call(xAxis)
        .selectAll("text");
        //.attr("transform",`rotate(45), translate(${x.bandwidth()},0)`);
  
      housing_age_svg.append("g")
        .call(yAxis)
      break;
    case "housing-value":
      //process data
      value_data = [];
      Object.keys(data).forEach(function(prop) {
        if (prop.includes("%VAL")) {
          value = prop.split("_")[1];
          switch(value) {
            case "0-50K":
              value_data.push(
                {
                  "index":0,
                  "value":"0-50K",
                  "pct":data[prop]
                });
              break;
            case "50-10":
              value_data.push(
                {
                  "index":1,
                  "value":"50-100K",
                  "pct":data[prop]
                });
              break;
            case "100-1":
              value_data.push(
                {
                  "index":2,
                  "value":"100-150K",
                  "pct":data[prop]
                });
              break;
            case "150-2":
              value_data.push(
                {
                  "index":3,
                  "value":"150-200K",
                  "pct":data[prop]
                });
              break;
            case "200-3":
              value_data.push(
                {
                  "index":4,
                  "value":"200-300K",
                  "pct":data[prop]
                });
              break;
            case "300-5":
              value_data.push(
                {
                  "index":5,
                  "value":"300-500K",
                  "pct":data[prop]
                });
              break;
            case "500K-":
              value_data.push(
                {
                  "index":6,
                  "value":"500K-1M",
                  "pct":data[prop]
                });
              break;
            case "1M+":
              value_data.push(
                {
                  "index":7,
                  "value":"1M+",
                  "pct":data[prop]
                });
              break;
          }
        }
      });
      //sort array by index
      value_data.sort((a, b) => a["index"]-b["index"]);

      //d3 bar chart
      d3.select("#housing-value-chart").remove()

      const housing_value_svg = d3.select("#housing-value")
        .append("svg")
        .attr("id","housing-value-chart")
        .attr("class","chart")
        .attr("viewBox", [0, 0, width, height]);

      xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(i => value_data[i].value).tickSizeOuter(0))

      yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(null, data.format))
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(data.y))

      x = d3.scaleBand()
        .domain(d3.range(value_data.length))
        .range([margin.left, width - margin.right])
        .padding(0.1)

      y = d3.scaleLinear()
        .domain([0, d3.max(value_data, d => d.pct)]).nice()
        .range([height - margin.bottom, margin.top])

      housing_value_svg.append("g")
        .attr("fill", color)
        .selectAll("rect")
        .data(value_data)
        .join("rect")
          .attr("x", (d, i) => x(i))
          .attr("y", d => y(d.pct))
          .attr("height", d => y(0) - y(d.pct))
          .attr("width", x.bandwidth());

      housing_value_svg.append("g")
        .call(xAxis)
        .selectAll("text")
        .attr("transform",`rotate(20), translate(${x.bandwidth()/4},5)`);
  
      housing_value_svg.append("g")
        .call(yAxis)
      break;
    case "ownership-rate":
      //filter for relevant data
      let owned, rented;
      Object.keys(data).forEach(function(prop) {
        if (prop==="%OWNOCC") {
          owned = data[prop];
          rented = 100-owned;
        }
      });

      //d3 chart
      if (!isNaN(owned)) {
        document.getElementById("owner-data").textContent=`${owned.toFixed(1)}%`;
        document.getElementById("renter-data").textContent=`${rented.toFixed(1)}%`;
      }
      else {
        document.getElementById("owner-data").textContent=`ERROR`;
        document.getElementById("renter-data").textContent=`ERROR`;
      }
      break;
    case "ownership-SMOC":
      //data processing
      let SMOC_mortgage_data = [];
      let SMOC_nomortgage_data = [];
      SMOC_mortgage_dict = {
        "0-0": "0-500",
        "0.5": "500-1K",
        "1-1": "1K-1.5K",
        "1.5": "1.5K-2K",
        "2-2": "2K-2.5K",
        "2.5": "2.5K-3K",
        "3K+": "3K+"
      };
      SMOC_nomortgage_dict = {
        "0-": "0-250",
        "25": "250-400",
        "40": "400-600",
        "60": "600-800",
        "80": "800-1K",
        "1K": "1K+"
      };
      SMOC_nomortgage_index_dict = {
        "0-": 0,
        "25": 1,
        "40": 2,
        "60": 3,
        "80": 4,
        "1K": 5
      };

      Object.keys(data).forEach(function(prop) {
        if (prop.includes("%SMOCM_")) {
          range = prop.split("_")[1];
          SMOC_mortgage_data.push({
              "SMOC":SMOC_mortgage_dict[range],
              "pct":data[prop]
            });
        }
        else if (prop.includes("%SMOCNM_")) {
          range = prop.split("_")[1];
          SMOC_nomortgage_data.push({
              "index":SMOC_nomortgage_index_dict[range],
              "SMOC":SMOC_nomortgage_dict[range],
              "pct":data[prop]
            });
        }
      });

      SMOC_nomortgage_data.sort((a, b) => a["index"]-b["index"]);

      //d3 chart for SMOC_mortgage_data
      d3.select("#SMOC_M-chart").remove()

      const SMOCM_svg = d3.selectAll("#SMOC_M-chart-container")
        .append("svg")
        .attr("id","SMOC_M-chart")
        .attr("class","chart")
        .attr("viewBox", [0, 0, width, height]);

      xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(i => SMOC_mortgage_data[i].SMOC).tickSizeOuter(0))

      yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(null, data.format))
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(data.y))

      x = d3.scaleBand()
        .domain(d3.range(SMOC_mortgage_data.length))
        .range([margin.left, width - margin.right])
        .padding(0.1)

      y = d3.scaleLinear()
        .domain([0, d3.max(SMOC_mortgage_data, d => d.pct)]).nice()
        .range([height - margin.bottom, margin.top])

      SMOCM_svg.append("g")
        .attr("fill", color)
        .selectAll("rect")
        .data(SMOC_mortgage_data)
        .join("rect")
          .attr("x", (d, i) => x(i))
          .attr("y", d => y(d.pct))
          .attr("height", d => y(0) - y(d.pct))
          .attr("width", x.bandwidth());

      SMOCM_svg.append("g")
        .call(xAxis)
        .selectAll("text")
        .attr("transform",`rotate(20), translate(${x.bandwidth()/4},5)`);
  
      SMOCM_svg.append("g")
        .call(yAxis)

      //d3 chart for SMOC_nomortgage_data
      d3.select("#SMOC_NM-chart").remove()

      const SMOCNM_svg = d3.selectAll("#SMOC_NM-chart-container")
        .append("svg")
        .attr("id","SMOC_NM-chart")
        .attr("class","chart")
        .attr("viewBox", [0, 0, width, height]);

      xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(i => SMOC_nomortgage_data[i].SMOC).tickSizeOuter(0))

      yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(null, data.format))
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(data.y))

      x = d3.scaleBand()
        .domain(d3.range(SMOC_nomortgage_data.length))
        .range([margin.left, width - margin.right])
        .padding(0.1)

      y = d3.scaleLinear()
        .domain([0, d3.max(SMOC_nomortgage_data, d => d.pct)]).nice()
        .range([height - margin.bottom, margin.top])

      SMOCNM_svg.append("g")
        .attr("fill", color)
        .selectAll("rect")
        .data(SMOC_nomortgage_data)
        .join("rect")
          .attr("x", (d, i) => x(i))
          .attr("y", d => y(d.pct))
          .attr("height", d => y(0) - y(d.pct))
          .attr("width", x.bandwidth());

      SMOCNM_svg.append("g")
        .call(xAxis)
        .selectAll("text")
        .attr("transform",`rotate(20), translate(${x.bandwidth()/4},5)`);
  
      SMOCNM_svg.append("g")
        .call(yAxis)

      break;
    case "ownership-rent":
      //extract relevant data
      rent_data = [];
      rent_dict = {
        "0-0.": "0-500",
        "0.5-": "500-1K",
        "1-1.": "1K-1.5K",
        "1.5-": "1.5K-2K",
        "2-2.": "2K-2.5K",
        "2.5-": "2.5K-3K",
        "3K+": "3K+"
      };
      Object.keys(data).forEach(function(prop) {
        if (prop.includes("%RENT_")) {
          range = prop.split("_")[1];
          rent_data.push(
            {
              "rent":rent_dict[range],
              "pct":data[prop]
            });
        }
      });

      //d3 chart
      d3.select("#housing-cost-renters-chart").remove()

      const rent_svg = d3.select("#housing-cost-renters")
        .append("svg")
        .attr("id","housing-cost-renters-chart")
        .attr("class","chart")
        .attr("viewBox", [0, 0, width, height]);

      xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(i => rent_data[i].rent).tickSizeOuter(0))

      yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(null, data.format))
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(data.y))

      x = d3.scaleBand()
        .domain(d3.range(rent_data.length))
        .range([margin.left, width - margin.right])
        .padding(0.1)

      y = d3.scaleLinear()
        .domain([0, d3.max(rent_data, d => d.pct)]).nice()
        .range([height - margin.bottom, margin.top])

      rent_svg.append("g")
        .attr("fill", color)
        .selectAll("rect")
        .data(rent_data)
        .join("rect")
          .attr("x", (d, i) => x(i))
          .attr("y", d => y(d.pct))
          .attr("height", d => y(0) - y(d.pct))
          .attr("width", x.bandwidth());

      rent_svg.append("g")
        .call(xAxis)
        .selectAll("text")
        .attr("transform",`rotate(20), translate(${x.bandwidth()/4},5)`);
  
      rent_svg.append("g")
        .call(yAxis)
      break;
    case "ownership-vacancy":
      //filter for relevant data
      let o_vacancy, r_vacancy;
      Object.keys(data).forEach(function(prop) {
        if (prop==="%OWNVAC") {
          o_vacancy = data[prop];
        }
        else if (prop==="%RENTVAC") {
          r_vacancy = data[prop];
        }
      });

      //d3 chart
      if (!isNaN(o_vacancy)) {
        document.getElementById("owner-vacancy-data").textContent=`${o_vacancy.toFixed(1)}%`;
        document.getElementById("renter-vacancy-data").textContent=`${r_vacancy.toFixed(1)}%`;
      }
      else {
        document.getElementById("owner-vacancy-data").textContent=`ERROR`;
        document.getElementById("renter-vacancy-data").textContent=`ERROR`;
      }
      break;
    case "utilities-internet":
      //extract relevant data
      internet_data = [];
      internet_dict = {
        "ANY": "Any Internet Service",
        "BBSAT": "Satellite Internet",
        "BBCEL": "Cellular Data Plan",
        "BBCAB": "Cable, DSL, or Fiber Optic",
        "DIALU": "Dial-up Internet"
      };
      internet_index_dict = {
        "ANY": 0,
        "BBSAT": 3,
        "BBCEL": 2,
        "BBCAB": 1,
        "DIALU": 4
      };
      Object.keys(data).forEach(function(prop) {
        if (prop.includes("%INT_")) {
          internet = prop.split("_")[1];
          if (internet_dict[internet]){
            internet_data.push(
              {
                "index":internet_index_dict[internet],
                "internet":internet_dict[internet],
                "pct":data[prop]
              });
          }
        }
      });

      //d3 chart
      d3.selectAll("ul.internet").remove();

      list = d3.selectAll("#utilities-internet")
        .append("ul")
        .attr("class","internet")
        .attr("id","utilities-internet-list");

      chart_width = document.getElementById("utilities-internet-list").clientWidth;

      internet_data.forEach(function (d) {
        list.append("li")
          .attr("class","internet-li-"+d["index"])
          .append("span")
            .attr("class","span-left")
            .style("flex","auto")
            .text(d["internet"]);

        d3.selectAll(".internet-li-"+d["index"])
          .append("span")
            .attr("class","span-right")
            .text(d["pct"].toFixed(1)+"%");

        g = d3.selectAll(".internet-li-"+d["index"])
          .append("svg")
          .attr("width",chart_width)
          .attr("height", 8)
          .style("margin", "4px 0 4px 0")
          .append("g")
        
        g.append("rect")
            .attr("fill",color)
            .attr("height", 8)
            .attr("width", chart_width*d["pct"]/100);

        g.append("rect")
          .attr("fill","rgb(223, 223, 223)")
          .attr("x", chart_width*d["pct"]/100)
          .attr("height", 10)
          .attr("width", chart_width-(chart_width*d["pct"]/100));
      });
      break;
    case "utilities-electricity":
      break;
    case "utilities-heating":
      //extract relevant data
      heating_data = [];
      heating_dict = {
        "COAL": "Coal",
        "ELEC": "Electricity",
        "GTAN": "Tank Gas",
        "GUTI": "Utility Gas",
        "KERO": "Kerosene",
        "WOOD": "Wood",
        "OTHE": "Other",
        "NONE": "No Fuel Used",
        "SOLA": "Solar"
      };
      heating_index_dict = {
        "COAL": 5,
        "ELEC": 0,
        "GTAN": 2,
        "GUTI": 1,
        "KERO": 3,
        "WOOD": 4,
        "OTHE": 6,
        "NONE": 7,
        "SOLA": 8
      }

      Object.keys(data).forEach(function(prop) {
        if (prop.includes("%HEAT_")) {
          heating = prop.split("_")[1];
          heating_data.push(
            {
              "index":heating_index_dict[heating],
              "heating":heating_dict[heating],
              "pct":data[prop]
            });
        }
      });
      heating_data.sort((a, b) => a["index"]-b["index"]);
      heating_data[7]["pct"] = heating_data[7]["pct"]+heating_data[8]["pct"];
      heating_data.pop();

      //d3 chart
      d3.selectAll("ul.heating").remove();

      list = d3.selectAll("#utilities-heating")
        .append("ul")
        .attr("class","heating")
        .attr("id","utilities-heating-list");

      chart_width = document.getElementById("utilities-heating-list").clientWidth;

      heating_data.forEach(function (d) {
        list.append("li")
          .attr("class","heating-li-"+d["index"])
          .append("span")
            .attr("class","span-left")
            .style("flex","auto")
            .text(d["heating"]);

        d3.selectAll(".heating-li-"+d["index"])
          .append("span")
            .attr("class","span-right")
            .text(d["pct"].toFixed(1)+"%");

        g = d3.selectAll(".heating-li-"+d["index"])
          .append("svg")
          .attr("width",chart_width)
          .attr("height", 8)
          .style("margin", "4px 0 4px 0")
          .append("g")
        
        g.append("rect")
            .attr("fill",color)
            .attr("height", 8)
            .attr("width", chart_width*d["pct"]/100);

        g.append("rect")
          .attr("fill","rgb(223, 223, 223)")
          .attr("x", chart_width*d["pct"]/100)
          .attr("height", 10)
          .attr("width", chart_width-(chart_width*d["pct"]/100));
      });

      break;
    case "utilities-water":
      break;
    case "transportation-commute":
      //process data
      for (var prop in data) {
        if (!data.hasOwnProperty(prop)) {
            //skip prototype properties
            continue;
        }
        if (prop==="AVGCOMMUTE") {
          commute = data[prop];
        }
      }
      let commute_relative;
      if (commute < 15.0) {
        commute_relative = "far below"
      }
      else if (commute < 20.0) {
        commute_relative = "below"
      }
      else if (commute > 35.0) {
        commute_relative = "far above"
      }
      else if (commute > 30.0) {
        commute_relative = "above"
      }
      else {
        commute_relative = "near"
      }
      
      //d3 chart
      if (!isNaN(commute)) {
        document.getElementById("average-commute-data").textContent=`${commute.toFixed(1)}`;
        document.getElementById("commute-relative-data").textContent=`${commute_relative}`;
      }
      else {
        document.getElementById("average-commute-data").textContent=`ERROR`;
        document.getElementById("commute-relative-data").textContent=`ERROR`;
      }
      break;
    case "transportation-means":
      //extract relevant data
      transport_means_data = [];
      transport_means_dict = {
        "CARPO": "Automobile — Carpool",
        "OTHER": "Other",
        "PUBTR": "Public Transportation",
        "SOLO": "Automobile — Alone",
        "WALK": "Walked",
        "WFH": "Worked From Home",
      };
      transport_means_index_dict = {
        "CARPO": 1,
        "OTHER": 4,
        "PUBTR": 2,
        "SOLO": 0,
        "WALK": 3,
        "WFH": 5,
      }

      Object.keys(data).forEach(function(prop) {
        if (prop.includes("%COM_")) {
          transport_means = prop.split("_")[1];
          transport_means_data.push(
            {
              "index":transport_means_index_dict[transport_means],
              "transport_means":transport_means_dict[transport_means],
              "pct":data[prop]
            });
        }
      });
      transport_means_data.sort((a, b) => a["index"]-b["index"]);

      //d3 chart
      d3.selectAll("ul.transport-means").remove();

      list = d3.selectAll("#transport-means")
        .append("ul")
        .attr("class","transport-means")
        .attr("id","transport-means-list");

      chart_width = document.getElementById("transport-means-list").clientWidth;

      transport_means_data.forEach(function (d) {
        list.append("li")
          .attr("class","transport-means-li-"+d["index"])
          .append("span")
            .attr("class","span-left")
            .style("flex","auto")
            .text(d["transport_means"]);

        d3.selectAll(".transport-means-li-"+d["index"])
          .append("span")
            .attr("class","span-right")
            .text(d["pct"].toFixed(1)+"%");

        g = d3.selectAll(".transport-means-li-"+d["index"])
          .append("svg")
          .attr("width",chart_width)
          .attr("height", 8)
          .style("margin", "4px 0 4px 0")
          .append("g")
        
        g.append("rect")
            .attr("fill",color)
            .attr("height", 8)
            .attr("width", chart_width*d["pct"]/100);

        g.append("rect")
          .attr("fill","rgb(223, 223, 223)")
          .attr("x", chart_width*d["pct"]/100)
          .attr("height", 10)
          .attr("width", chart_width-(chart_width*d["pct"]/100));
      });

      break;
    case "transportation-vehicles":
      vehicle_data = [];

      Object.keys(data).forEach(function(prop) {
        if (prop.includes("%VEH")) {
          vehicles = prop.split("_")[1];
          vehicle_data.push(
            {
              "vehicles":vehicles,
              "pct":data[prop]
            });
        }
      });

      //d3 chart
      d3.select("#vehicles-chart").remove()

      const vehicles_svg = d3.select("#vehicles")
        .append("svg")
        .attr("id","vehicles-chart")
        .attr("class","chart")
        .attr("viewBox", [0, 0, width, height]);

      xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(i => vehicle_data[i].vehicles).tickSizeOuter(0))

      yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(null, data.format))
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(data.y))

      x = d3.scaleBand()
        .domain(d3.range(vehicle_data.length))
        .range([margin.left, width - margin.right])
        .padding(0.1)

      y = d3.scaleLinear()
        .domain([0, d3.max(vehicle_data, d => d.pct)]).nice()
        .range([height - margin.bottom, margin.top])

      vehicles_svg.append("g")
        .attr("fill", color)
        .selectAll("rect")
        .data(vehicle_data)
        .join("rect")
          .attr("x", (d, i) => x(i))
          .attr("y", d => y(d.pct))
          .attr("height", d => y(0) - y(d.pct))
          .attr("width", x.bandwidth());

      vehicles_svg.append("g")
        .call(xAxis)
        .selectAll("text");
  
      vehicles_svg.append("g")
        .call(yAxis)

      break;
    case "transportation-shipping":
      //data
      for (var prop in data) {
        if (!data.hasOwnProperty(prop)) {
            //skip prototype properties
            continue;
        }
        if (prop==="NUM_PO") {
          num_po = data[prop];
        }
        else if (prop==="NUM_UPS") {
          num_ups = data[prop];
        }
        else if (prop==="NUM_FE") {
          num_fe = data[prop];
        }
        else if (prop==="NUM_DHL") {
          num_dhl = data[prop];
        }
      }

      //d3 viz
      if (!isNaN(num_po)) {
        document.getElementById("shipping-po").textContent=`${num_po.toFixed(0)}`;
        document.getElementById("shipping-fe").textContent=`${num_fe.toFixed(0)}`;
        document.getElementById("shipping-ups").textContent=`${num_ups.toFixed(0)}`;
        document.getElementById("shipping-dhl").textContent=`${num_dhl.toFixed(0)}`;
      }
      else {
        document.getElementById("shipping-po").textContent=`ERROR`;
        document.getElementById("shipping-fe").textContent=`ERROR`;
        document.getElementById("shipping-ups").textContent=`ERROR`;
        document.getElementById("shipping-dhl").textContent=`ERROR`;
      }

      break;
    case "environment-hazards":
      //data
      hazard_data = [];
      hazard_dict = {
        "WILDFIR": "Wildfire Risk",
        "VOLCANO": "Volcano Risk",
        "TORNADO": "Tornado Risk",
        "SNOWFAL": "Blizzard Risk",
        "LANDSLI": "Landslide Risk",
        "HURRICA": "Hurricane Risk",
        "EARTHQU": "Earthquake Risk",
        "DROUGHT": "Drought Risk",
        "HEATWAV": "Heatwave Risk",
        "AVALANC": "Avalanche Risk",
        "FLOOD": "Flood Risk"
      };
      hazard_index_dict = {
        "WILDFIR": 0,
        "VOLCANO": 1,
        "TORNADO": 2,
        "SNOWFAL": 3,
        "LANDSLI": 4,
        "HURRICA": 5,
        "EARTHQU": 6,
        "DROUGHT": 7,
        "HEATWAV": 8,
        "AVALANC": 9,
        "FLOOD": 10
      }

      Object.keys(data).forEach(function(prop) {
        if (prop.includes("nh_")) {
          hazard = prop.split("_")[1];
          if (hazard_dict[hazard]){
            if (data[prop]=="Low") {
              risk = 1;
            }
            else if (data[prop]=="Medium") {
              risk = 2;
            }
            else if (data[prop]=="High") {
              risk = 3;
            }
            else {
              risk = 0;
            }

            hazard_data.push(
              {
                "index":hazard_index_dict[hazard],
                "hazard":hazard_dict[hazard],
                "risk":risk,
                "label":data[prop]
              });
          }
        }
      });
      hazard_data.sort((a, b) => a["index"]-b["index"]);
      
      //console.log(hazard_data);

      //d3 viz

      d3.selectAll("ul.hazards").remove();

      list = d3.selectAll("#natural-hazards")
        .append("ul")
        .attr("class","hazards")
        .attr("id","natural-hazards-list");

      chart_width = document.getElementById("natural-hazards-list").clientWidth;

      hazard_data.forEach(function (d) {
        list.append("li")
          .attr("class","hazards-li-"+d["index"])
          .append("span")
            .attr("class","span-left")
            .style("flex","auto")
            .text(d["hazard"]);

        d3.selectAll(".hazards-li-"+d["index"])
          .append("span")
            .attr("class","span-right")
            .text(d["label"]);

        g = d3.selectAll(".hazards-li-"+d["index"])
          .append("svg")
          .attr("width",chart_width)
          .attr("height", 8)
          .style("margin", "4px 0 4px 0")
          .append("g")
        
        g.append("rect")
            .attr("fill",color)
            .attr("height", 8)
            .attr("width", chart_width*d["risk"]/3);

        g.append("rect")
          .attr("fill","rgb(223, 223, 223)")
          .attr("x", chart_width*d["risk"]/3)
          .attr("height", 10)
          .attr("width", chart_width-(chart_width*d["risk"]/3));
      });


      break;
    case "environment-eqi":
      //data processing
      eqi_data = [];
      eqi_dict = {
        "air%il": "Air EQI",
        "built%": "Built Environment EQI",
        "land%i": "Land EQI",
        "socio%": "Sociodemographic EQI",
        "total%": "Overall EQI",
        "water%": "Water EQI"
      };
      eqi_index_dict = {
        "air%il": 1,
        "built%": 4,
        "land%i": 3,
        "socio%": 5,
        "total%": 0,
        "water%": 2
      }

      Object.keys(data).forEach(function(prop) {
        if (prop.includes("eqi_")) {
          eqi = prop.split("_")[1];

          eqi_data.push(
            {
              "index":eqi_index_dict[eqi],
              "label":eqi_dict[eqi],
              "value":data[prop]
            });
        }
      });
      eqi_data.sort((a, b) => a["index"]-b["index"]);

      //console.log(eqi_data);
      
      //d3 viz

      d3.selectAll("ul.eqi").remove();

      list = d3.selectAll("#eqi")
        .append("ul")
        .attr("class","eqi")
        .attr("id","eqi-list");

      chart_width = document.getElementById("eqi-list").clientWidth;

      eqi_data.forEach(function (d) {
        list.append("li")
          .attr("class","eqi-li-"+d["index"])
          .append("span")
            .attr("class","span-left")
            .style("flex","auto")
            .text(d["label"]);

        d3.selectAll(".eqi-li-"+d["index"])
          .append("span")
            .attr("class","span-right")
            .text((d["value"]*100).toFixed(1)+" PR");

        g = d3.selectAll(".eqi-li-"+d["index"])
          .append("svg")
          .attr("width",chart_width)
          .attr("height", 8)
          .style("margin", "4px 0 4px 0")
          .append("g")
        
        g.append("rect")
            .attr("fill",color)
            .attr("height", 8)
            .attr("width", chart_width*d["value"]);

        g.append("rect")
          .attr("fill","rgb(223, 223, 223)")
          .attr("x", chart_width*d["value"])
          .attr("height", 10)
          .attr("width", chart_width-(chart_width*d["value"]));
      });


      break;
    case "environment-nata":
      //data processing
      for (var prop in data) {
        if (!data.hasOwnProperty(prop)) {
            //skip prototype properties
            continue;
        }
        if (prop==="chi_c%ile") {
          chi = 100*parseFloat(data[prop]);
        }
        else if (prop==="rhi_r%ile") {
          rhi = 100*parseFloat(data[prop]);
        }
      }

      //d3 viz
      if (!isNaN(commute)) {
        document.getElementById("cancer-risk").textContent=`${chi.toFixed(1)} PR`;
        document.getElementById("respiratory-risk").textContent=`${rhi.toFixed(1)} PR`;
      }
      else {
        document.getElementById("cancer-risk").textContent=`ERROR`;
        document.getElementById("respiratory-risk").textContent=`ERROR`;
      }

      break;
    case "environment-climate":
      //data processing
      temp_data = [];
      prcp_data = [];

      month_i = {
        "JAN": 0,
        "FEB": 1,
        "MAR": 2,
        "APR": 3,
        "MAY": 4,
        "JUN": 5,
        "JUL": 6,
        "AUG": 7,
        "SEP": 8,
        "OCT": 9,
        "NOV": 10,
        "DEC": 11
      }

      Object.keys(data).forEach(function(prop) {
        if (prop.includes("temp")) {
          month=prop.split("_")[1];
          temp_data.push(
            {
              "month":month,
              "temp":data[prop],
              "index":month_i[month]
            });
        }
        else if (prop.includes("prcp")) {
          month=prop.split("_")[1]
          prcp_data.push(
            {
              "month":month,
              "prcp":data[prop],
              "index":month_i[month]
            });
        }
      });

      temp_data.sort((a, b) => a["index"]-b["index"]);
      prcp_data.sort((a, b) => a["index"]-b["index"]);

      //d3 viz temp
      d3.select("#temp-chart").remove()

      const temp_svg = d3.select("#temp-chart-container")
        .append("svg")
        .attr("id","temp-chart")
        .attr("class","chart")
        .attr("viewBox", [0, 0, width, height]);

      xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(i => temp_data[i].month).tickSizeOuter(0))

      yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(null, data.format))
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(data.y))

      x = d3.scaleBand()
        .domain(d3.range(temp_data.length))
        .range([margin.left, width - margin.right])
        .padding(0.1)

      y = d3.scaleLinear()
        .domain([0, 90]).nice()
        .range([height - margin.bottom, margin.top])

      temp_svg.append("path")
        .datum(temp_data)
        .attr("fill","none")
        .attr("stroke","black")
        .attr("stroke-width",3)
        .attr("d",d3.line()
          .x(function(d, i) {return x(i)+x.bandwidth()/2})
          .y(function(d) {return y(d.temp)})
          .curve(d3.curveMonotoneX)
          );

      temp_svg.append("g")
        .call(xAxis)
        .selectAll("text");
  
      temp_svg.append("g")
        .call(yAxis)

      //d3 viz precip

      d3.select("#precip-chart").remove()

      const prcp_svg = d3.select("#precip-chart-container")
        .append("svg")
        .attr("id","precip-chart")
        .attr("class","chart")
        .attr("viewBox", [0, 0, width, height]);

      xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(i => prcp_data[i].month).tickSizeOuter(0))

      yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(null, data.format))
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(data.y))

      x = d3.scaleBand()
        .domain(d3.range(prcp_data.length))
        .range([margin.left, width - margin.right])
        .padding(0.1)

      y = d3.scaleLinear()
        .domain([0, 15]).nice()
        .range([height - margin.bottom, margin.top])

      prcp_svg.append("path")
        .datum(prcp_data)
        .attr("fill","none")
        .attr("stroke","black")
        .attr("stroke-width",3)
        .attr("d",d3.line()
          .x(function(d, i) {return x(i)+x.bandwidth()/2})
          .y(function(d) {return y(d.prcp)})
          .curve(d3.curveMonotoneX)
          );

      prcp_svg.append("g")
        .call(xAxis)
        .selectAll("text");
  
      prcp_svg.append("g")
        .call(yAxis)

      break;
    default:
      break;
  }
}

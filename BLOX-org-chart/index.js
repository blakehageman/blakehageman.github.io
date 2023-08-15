
var chart;

d3.csv('./orgData.csv'
).then((dataFlattened) => {
  chart = new d3.OrgChart()
    .container('.chart-container')
    .data(dataFlattened)
    .nodeHeight((d) => 70)
    .nodeWidth((d) => 250)
    .childrenMargin((d) => 50)
    .compactMarginBetween((d) => 35)
    .compactMarginPair((d) => 30)
    .neightbourMargin((a, b) => 20)
    .buttonContent(({ node, state }) => {
      return `<div style="border-radius:3px;padding:3px;font-size:10px;margin:auto auto;background-color:lightgray"> <span style="font-size:9px">${
        node.children
          ? `<i class="fas fa-chevron-up"></i>`
          : `<i class="fas fa-chevron-down"></i>`
      }</span> ${node.data._directSubordinates}  </div>`;
    })
    .nodeContent(function (d, i, arr, state) {
      const colors = ['#278B8D', '#404040', '#0C5C73', '#33C6CB'];
      const color = colors[d.depth % colors.length];
      return `
        <div class="node" style="background-color:${color}; width:${d.width}px; height:${d.height}px;">
            <img class="image" src='${d.data.imageUrl ? d.data.imageUrl : './placeholder.png'}'/>
            <div class="textbox" style="width:${d.width}px;">
                <div class="node-name"> ${d.data.name} </div>
                <div class="node-position"> ${d.data.positionName} </div>
            </div>
        </div>`;
    })
    .render()
    .expandAll();
});
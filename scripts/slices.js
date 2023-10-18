// Create circular slices in Adobe Illustrator
(function() {
  // Check if a document is open
  if (app.documents.length === 0) {
      alert("Please open a document before running the script.");
      return;
  }

  var doc = app.activeDocument;

  // Create a layer named "slices"
  var slicesLayer;
  if (doc.layers.length > 0 && doc.layers[0].name === "slices") {
      slicesLayer = doc.layers[0];
  } else {
      slicesLayer = doc.layers.add();
      slicesLayer.name = "slices";
  }

  // Define the inner and outer radius
  var innerRadius = 280;
  var outerRadius = 369;

  // Function to create a slice
  function createSlice(startAngle, endAngle) {
      var startRadian = (startAngle / 180) * Math.PI;
      var endRadian = (endAngle / 180) * Math.PI;

      var innerStartX = innerRadius * Math.cos(startRadian);
      var innerStartY = innerRadius * Math.sin(startRadian);
      var innerEndX = innerRadius * Math.cos(endRadian);
      var innerEndY = innerRadius * Math.sin(endRadian);

      var outerStartX = outerRadius * Math.cos(startRadian);
      var outerStartY = outerRadius * Math.sin(startRadian);
      var outerEndX = outerRadius * Math.cos(endRadian);
      var outerEndY = outerRadius * Math.sin(endRadian);

      var slice = slicesLayer.pathItems.add();
      slice.setEntirePath([
          [0, 0],
          [innerStartX, innerStartY],
          [outerStartX, outerStartY],
          [outerEndX, outerEndY],
          [innerEndX, innerEndY],
          [0, 0]
      ]);
      return slice;
  }

  // Create 24 slices
  var angleIncrement = 7.5;
  for (var i = 0; i < 24; i++) {
      var slice = createSlice(0, (i + 1) * angleIncrement - 1.4);
      slice.name = (i + 1).toString();
  }

  // Alert user when slices have been created
  alert("24 slices have been created!");

})();

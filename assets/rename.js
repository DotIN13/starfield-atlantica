function renamePathsInActiveLayer() {
  // Check if a document is open
  if (app.documents.length === 0) {
      alert("No document open!");
      return;
  }

  var doc = app.activeDocument;
  var activeLayer = doc.activeLayer;
  var pathCounter = 0;

  for (var i = 0; i < activeLayer.pathItems.length; i++) {
      var pathItem = activeLayer.pathItems[i];

      // Check if the pathItem is visible
      if (!pathItem.hidden) {
          pathCounter++;
          pathItem.name = pathCounter.toString();
      }
  }

  alert("Renamed " + pathCounter + " paths in the active layer.");
}

// Call the function
renamePathsInActiveLayer();

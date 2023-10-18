// Create function to export paths from active layer to PNG
function exportPathsToPNG() {
  // Check if a document is open
  if (app.documents.length === 0) {
      alert("No document open!");
      return;
  }

  var doc = app.activeDocument;
  var activeLayer = doc.activeLayer;
  var exportOptions = new ExportOptionsPNG24();
  var type = ExportType.PNG24;
  var file;
  var widthsList = [];
  var destFolder = Folder.selectDialog("Select a folder to save the PNGs:");

  if (destFolder === null) {
      // User canceled folder selection
      return;
  }

  exportOptions.antiAliasing = true;
  exportOptions.transparency = true;
  exportOptions.artBoardClipping = true;

  var pathCounter = 0;

  for (var i = 0; i < activeLayer.pathItems.length; i++) {
      var pathItem = activeLayer.pathItems[i];

      // Check if the pathItem is visible
      if (!pathItem.hidden) {
          pathCounter++;

          // Set the current path as the only visible item
          for (var j = 0; j < activeLayer.pageItems.length; j++) {
              activeLayer.pageItems[j].hidden = true;
          }
          pathItem.hidden = false;

          file = new File(destFolder + "/" + pathCounter + ".png");
          doc.exportFile(file, type, exportOptions);
          
          // Add the width of the current image to the list
          widthsList.push(pathItem.width);
      }
  }

  // Restore the visibility of all items in the layer
  for (i = 0; i < activeLayer.pageItems.length; i++) {
      activeLayer.pageItems[i].hidden = false;
  }

  alert("Exported paths:\n" + widthsList.join(", "));
}

// Call the function
exportPathsToPNG();

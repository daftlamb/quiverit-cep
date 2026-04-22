// host.jsx - Quiver It ExtendScript host

function insertSVG(svgString) {
  try {
    var doc = app.activeDocument;
    // Write SVG to a temp file then place it
    var tmpFile = new File(Folder.temp + "/quiverit_tmp.svg");
    tmpFile.open("w");
    tmpFile.write(svgString);
    tmpFile.close();

    var placed = doc.groupItems.createFromFile(tmpFile);
    placed.position = [
      (doc.width - placed.width) / 2,
      (doc.height + placed.height) / 2
    ];
    tmpFile.remove();
    return "ok:" + placed.name;
  } catch (e) {
    return "err:" + e.message;
  }
}

function getDocInfo() {
  try {
    var doc = app.activeDocument;
    return JSON.stringify({ name: doc.name, width: doc.width, height: doc.height });
  } catch (e) {
    return JSON.stringify({ name: "", width: 0, height: 0 });
  }
}

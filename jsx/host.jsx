// Quiver It ExtendScript host.

function insertEncodedSVG(encodedSVG) {
  try {
    if (app.documents.length === 0) return 'Open a document first.';
    var svgString = decodeURIComponent(encodedSVG || '');
    if (!svgString) return 'No SVG data received.';

    var doc = app.activeDocument;
    var temp = new File(Folder.temp + '/quiverit_trace_' + new Date().getTime() + '.svg');
    temp.encoding = 'UTF-8';
    if (!temp.open('w')) return 'Could not create temp SVG file.';
    temp.write(svgString);
    temp.close();

    var placed = doc.groupItems.createFromFile(temp);
    placed.name = 'Quiver It Trace';
    try { placed.note = 'quiverit-generated'; } catch (e1) {}
    centerOnActiveArtboard(doc, placed);
    try { temp.remove(); } catch (e2) {}
    doc.selection = null;
    placed.selected = true;
    return 'ok:Inserted Quiver It trace.';
  } catch (err) {
    return describeError(err);
  }
}

function centerOnActiveArtboard(doc, item) {
  try {
    var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var cx = (ab[0] + ab[2]) / 2;
    var cy = (ab[1] + ab[3]) / 2;
    item.position = [cx - item.width / 2, cy + item.height / 2];
  } catch (e) {}
}

function describeError(err) {
  var msg = 'Error: ' + err;
  try {
    if (err && err.line) msg += ' line ' + err.line;
  } catch (e) {}
  return msg;
}

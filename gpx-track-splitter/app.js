function save(filename, data) {
  const blob = new Blob([data], { type: "application/gpx+xml" });
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveBlob(blob, filename);
  } else {
    const elem = window.document.createElement("a");
    elem.href = window.URL.createObjectURL(blob);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  }
}
function clean(node) {
  for (var n = 0; n < node.childNodes.length; n++) {
    var child = node.childNodes[n];
    if (
      child.nodeType === 8 ||
      (child.nodeType === 3 && !/\S/.test(child.nodeValue))
    ) {
      node.removeChild(child);
      n--;
    } else if (child.nodeType === 1) {
      clean(child);
    }
  }
}
function handleFileSelect(evt) {
  let file = evt.target.files[0];
  let reader = new FileReader();
  // params
  // rename track(s)
  let changeTrkName = document.querySelector("#fileName2TrkName").checked;
  // keep tracks as is, split segments
  let splitSegOnly = document.querySelector("#splitSegOnly").checked;
  // split into equal segments
  let splitCountEq = document.querySelector("#splitCountEq").checked;
  // split count
  let splitAt = document.querySelector("#splitAt").value;
  // keep common point
  let keepCommonPt = document.querySelector("#keepCommonPt").checked;
  // split track suffix
  let trkSuffix = document.querySelector("#trkSuffix").value;
  // split file name suffix
  let fileSuffix = document.querySelector("#fileSuffix").value;
  if (keepCommonPt) {
    splitAt--;
  }
  reader.readAsText(file);
  reader.onloadend = function (e) {
    let gpxSrcDoc = new DOMParser().parseFromString(
      e.target.result,
      "application/xml"
    );
    const errorNode = gpxSrcDoc.querySelector("parsererror");
    if (errorNode) {
      alert(
        "GPX malformed!\n" +
          errorNode.childNodes[0].textContent +
          "\n" +
          errorNode.childNodes[1].textContent
      );
      return;
    }
    let gpxSrc = gpxSrcDoc.getElementsByTagName("gpx");
    if (gpxSrc.length != 1) {
      alert("GPX malformed! Multiple gpx tags.");
      return;
    }

    let trkSrcNodes = gpxSrc[0].getElementsByTagName("trk");
    let trkDstNodes = [];
    let i = 0;
    for (let trkNode of trkSrcNodes) {
      let trksegNodes = [];
      for (let trksegNode of trkNode.getElementsByTagName("trkseg")) {
        let trkptNodes = trksegNode.getElementsByTagName("trkpt");
        let segmentCount = Math.ceil(trkptNodes.length / splitAt);
        let trkptLimit = splitAt;
        if (splitCountEq) {
          trkptLimit = Math.ceil(trkptNodes.length / segmentCount);
        }
        for (let i = 0; i < segmentCount; i++) {
          let tmpTrksegNode = trksegNode.cloneNode(true);
          let tmpTrkptNodes = tmpTrksegNode.getElementsByTagName("trkpt");
          const ptCnt = tmpTrkptNodes.length;
          for (let tbr = 0; tbr < ptCnt; tbr++) {
            tmpTrkptNodes[0].remove();
          }
          let j = 0;
          for (
            ;
            j < trkptLimit && i * trkptLimit + j < trkptNodes.length;
            j++
          ) {
            tmpTrksegNode.appendChild(
              trkptNodes[i * trkptLimit + j].cloneNode(true)
            );
          }
          // no need to add 1 since j is post-incremented
          if (keepCommonPt && i * trkptLimit + j < trkptNodes.length) {
            tmpTrksegNode.appendChild(
              trkptNodes[i * trkptLimit + j].cloneNode(true)
            );
          }
          if (splitSegOnly) {
            trksegNodes.push(tmpTrksegNode);
          } else {
            let tmpTrkDstNode = trkNode.cloneNode(true);
            for (let tbr of tmpTrkDstNode.getElementsByTagName("trkseg")) {
              tbr.remove();
            }
            if (changeTrkName) {
              tmpTrkDstNode.getElementsByTagName("name")[0].textContent =
                file.name.slice(0, -4) + trkSuffix + String(i).padStart(2, "0");
            } else {
              tmpTrkDstNode.getElementsByTagName("name")[0].textContent +=
                trkSuffix + String(i).padStart(2, "0");
            }
            if (tmpTrkDstNode.getElementsByTagName("desc").length != 0) {
              tmpTrkDstNode.getElementsByTagName("desc")[0].textContent +=
                trkSuffix + String(i).padStart(2, "0");
            }
            tmpTrkDstNode.appendChild(tmpTrksegNode);
            trkDstNodes.push(tmpTrkDstNode);
          }
        }
      }
      if (splitSegOnly) {
        let tmpTrksegNodes = trkNode.getElementsByTagName("trkseg");
        const ptCnt = tmpTrksegNodes.length;
        for (let tbr = 0; tbr < ptCnt; tbr++) {
          tmpTrksegNodes[0].remove();
        }
        trksegNodes.forEach((trksegNode) => {
          trkNode.appendChild(trksegNode);
        });
      }
      i++;
    }

    if (!splitSegOnly) {
      const ptCnt = trkSrcNodes.length;
      for (let tbr = 0; tbr < ptCnt; tbr++) {
        trkSrcNodes[0].remove();
      }
      trkDstNodes.forEach((trkDstNode) => {
        gpxSrc[0].appendChild(trkDstNode);
      });
    }

    const serializer = new XMLSerializer();
    clean(gpxSrc[0]);
    const gpxStr = serializer.serializeToString(gpxSrc[0]);
    let name = file.name.split(".");
    name.splice(-1, 0, fileSuffix);
    save(name.join("."), gpxStr);
  };
}

//progressive web app registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(
    (registration) => {
      console.log("Service worker registration successful:", registration);
    },
    (error) => {
      console.error(`Service worker registration failed: ${error}`);
    }
  );
} else {
  console.error("Service workers are not supported.");
}

//entry point: upload file
document
  .getElementById("file")
  .addEventListener("change", handleFileSelect, false);

//debug Android intent input
var parsedUrl = new URL(window.location.toString());
console.log('Debug input: ' + parsedUrl.toJSON());
'use strict';
/* eslint camelcase:0, quotes:0, space-unary-ops:0, no-alert:0, no-unused-vars:0, no-shadow:0, no-extend-native:0, no-trailing-spaces:0 */

function createCookie(name, value, days) {
    var expires;
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    } else {
        expires = "";
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

function mapDiameter() {
  // Map diameter in meters
  return data.get("size") / 100 * data.get("scale");
}

function eraseCookie(name) {
    createCookie(name, "", -1);
}

function computeLonLat(data) {
  var metersPerDeg = mapCalc.metersPerDegree(data.get("lat"));
  return [
      data.get("lon") + (data.get("offsetX") + data.get("multipartXpc") / 100 * mapDiameter()) / metersPerDeg.lon,
      data.get("lat") + (data.get("offsetY") + data.get("multipartYpc") / 100 * mapDiameter()) / metersPerDeg.lat ];
}

function getUrlParam(name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)", "i"),
        results = regex.exec(url);
    if (!results) {
        return null;
    }
    if (!results[2]) {
        return '';
    }
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function uriEncodeRequestId(rid) {
  if (rid === undefined || rid === null || rid === "") {
    return rid;
  }
  var parts = rid.split('/', 2);
  return parts[0] + '/' + encodeURIComponent(parts[1]);
}

(function(){
  var TM_HOST = "https://" + TM_DOMAIN;
  // XXX It would make more sense to have the S3 host in environment.js
  var MAPS_S3_HOST = window.location.protocol + "//s3-" + TM_REGION + ".amazonaws.com/" + window.TM_ENVIRONMENT + ".maps.touch-mapper";

  function idStart(id) {
    return id.split('/', 2)[0];
  }

  function idVersion(id) {
    if (idStart(id).substring(0, 1) === 'B') {
      return 2;
    } else {
      return 1;
    }
  }

  window.makeCloudFrontInfoUrl = function(id) {
    if (idVersion(id) === 2) {
      // v2 ID. Has different prefix from the data files, so S3 can be configured to never expire the info files.
      return TM_HOST + "/map/info/" + idStart(id) + '.json';
    } else {
      return TM_HOST + "/map/" + idStart(id) + '/info.json';
    }
  };

  function dataPrefix(id) {
    if (idVersion(id) === 2) {
      return "/map/data/" + uriEncodeRequestId(id);
    } else {
      return "/map/" + uriEncodeRequestId(id);
    }
  }

  window.makeS3url = function(id) {
    return MAPS_S3_HOST + dataPrefix(id) + '.stl';
  };

  window.makeS3urlSvg = function(id) {
    return MAPS_S3_HOST + dataPrefix(id) + '.svg';
  };

  window.makeCloudFrontUrl = function(id) {
    return TM_HOST + dataPrefix(id) + '.stl';
  };

  window.makeCloudFrontUrlSvg = function(id) {
    return TM_HOST + dataPrefix(id) + '.svg';
  };

  window.makeCloudFrontUrlPdf = function(id) {
    return TM_HOST + dataPrefix(id) + '.pdf';
  };

  window.makeMapPageUrlRelative = function(id) {
    return "map?map=" + idStart(id);
  };

  window.makeMapPermaUrl = function(id) {
    return TM_HOST + '?map=' + idStart(id);
  };

  window.makeReturnUrl = window.makeMapPermaUrl;
})();

function showError(errorMsg) {
  $("#output").append(
    $("<div>").text(errorMsg).addClass("error-msg large-row").attr("role", "alert")
  ).slideDown();
}

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
  };
}

function optionExistsInSelect($elem, value) {
  var exists = false;
  $elem.find('option').each(function(){
    if (this.value === "" + value) {
        exists = true;
    }
  });
  return exists;
}

function setLocalStorage(key, value) {
  window.localStorage[key] = value;
}

function getLocalStorageStr(key, defaultValue) {
  return window.localStorage[key] || defaultValue;
}
function getLocalStorageInt(key, defaultValue) {
  var str = getLocalStorageStr(key);
  return str ? parseInt(str, 10) : defaultValue;
}

function newMapId() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  // Return a v2 ID which starts with capital B.
  // v1 IDs are all lower case.
  return 'B' + s4().substring(1) + s4() + s4() + s4();
}

function loadInfoJson(id) {
  return $.ajax({
      url: makeCloudFrontInfoUrl(id)
  }).fail(function(jqXHR, textStatus, errorThrown){
    if (jqXHR.status === 404) {
      alert("There is no map for ID " + id);
    } else {
      alert("Error: " + textStatus);
    }
  }).done(function(data, textStatus, jqXHR){
    if (typeof data === 'string') {
      // Old info.json files may have content type text/plain
      data = JSON.parse(data);
    };
    return data;
  });
}

/**
 * 학번, 이름, 희망학과 및 진로 조사 데이터 연동 Google Apps Script
 * - 웹 앱 URL에서 ?api=true 파라미터를 입력하면 JSON 데이터를 반환합니다.
 * - 일반 브라우저에서 접근 시 아름다운 React 대시보드 웹 UI를 랜더링합니다.
 */

function doGet(e) {
  // 1. ?api=true 파라미터가 들어온 경우 JSON 데이터 반환 (API 모드)
  if (e && e.parameter && e.parameter.api === "true") {
    try {
      var data = getSpreadsheetData();
      var output = ContentService.createTextOutput(JSON.stringify(data));
      output.setMimeType(ContentService.MimeType.JSON);
      // CORS 및 보안 프레임 제한 해지 허용
      return output;
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // 2. 일반 접속 시 대시보드 HTML 로드 (Web UI 모드)
  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('진로 · 희망학과 실시간 대시보드')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) // 외부 iframe 허용
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    return HtmlService.createHtmlOutput("<h1>대시보드 HTML 파일(Index.html)을 찾을 수 없습니다.</h1><p>" + err.message + "</p>");
  }
}

/**
 * 활성화된 스프레드시트에서 데이터를 탐색하고 매핑 구조로 반환합니다.
 */
function getSpreadsheetData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheet = null;
  
  // 1. 대소문자 구분 없이 "db" 시트명을 1순위로 탐색하여 우선 연동합니다.
  for (var i = 0; i < sheets.length; i++) {
    var sName = sheets[i].getName().trim().toLowerCase();
    if (sName === "db") {
      sheet = sheets[i];
      break;
    }
  }
  
  // 만약 정확히 "db"인 시트가 없다면, "db"가 포함된 시트명을 2순위로 찾습니다.
  if (!sheet) {
    for (var i = 0; i < sheets.length; i++) {
      var sName = sheets[i].getName().trim().toLowerCase();
      if (sName.indexOf("db") !== -1) {
        sheet = sheets[i];
        break;
      }
    }
  }
  
  // 여전히 없다면, 기존 방식대로 설문/응답/학생 관련 시트를 찾습니다.
  if (!sheet && sheets.length > 1) {
    for (var i = 0; i < sheets.length; i++) {
      var sName = sheets[i].getName();
      if (sName.indexOf("응답") !== -1 || sName.indexOf("설문") !== -1 || sName.indexOf("Form") !== -1 || sName.indexOf("학생") !== -1 || sName.indexOf("data") !== -1) {
        sheet = sheets[i];
        break;
      }
    }
  }
  
  // 시트를 아예 지정할 수 없다면 활성 시트나 첫 번째 시트를 사용합니다.
  if (!sheet) {
    sheet = ss.getActiveSheet() || sheets[0];
  }
  
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  if (values.length < 2) {
    return []; // 헤더 외 데이터가 없는 경우
  }
  
  var headers = values[0].map(function(h) { 
    return String(h).trim().replace(/\s+/g, "").toLowerCase(); 
  });
  var rows = values.slice(1);
  
  // 열들의 매핑 인덱스 정의 (매칭되지 않은 경우 -1)
  var colIndices = {
    submittedAt: -1,
    stuNo: -1,
    name: -1,
    dept1: -1,
    dept2: -1,
    careersRaw: -1,
    track: -1,
    ref1: -1,
    ref2: -1,
    ref3: -1,
    ref4: -1,
    ref5: -1
  };
  
  // 헤더 텍스트 매칭 기반으로 열 위치 확인 (사용자가 컬럼을 임의 배치하더라도 유연하게 작동)
  headers.forEach(function(header, idx) {
    if (header.indexOf("타임") !== -1 || header.indexOf("시간") !== -1 || header.indexOf("timestamp") !== -1 || header.indexOf("submittedat") !== -1) {
      if (colIndices.submittedAt === -1) colIndices.submittedAt = idx;
    } else if (header.indexOf("학번") !== -1 || header.indexOf("number") !== -1 || header.indexOf("stuno") !== -1) {
      if (colIndices.stuNo === -1) colIndices.stuNo = idx;
    } else if (header.indexOf("이름") !== -1 || header.indexOf("성명") !== -1 || header.indexOf("name") !== -1) {
      if (colIndices.name === -1) colIndices.name = idx;
    } else if (header.indexOf("희망학과1") !== -1 || header.indexOf("1지망") !== -1 || header.indexOf("선택1") !== -1 || header.indexOf("우선학과") !== -1 || header.indexOf("dept1") !== -1) {
      if (colIndices.dept1 === -1) colIndices.dept1 = idx;
    } else if (header.indexOf("희망학과2") !== -1 || header.indexOf("2지망") !== -1 || header.indexOf("선택2") !== -1 || header.indexOf("dept2") !== -1) {
      if (colIndices.dept2 === -1) colIndices.dept2 = idx;
    } else if (header.indexOf("진로") !== -1 || header.indexOf("직업") !== -1 || header.indexOf("상세") !== -1 || header.indexOf("career") !== -1) {
      if (colIndices.careersRaw === -1) colIndices.careersRaw = idx;
    } else if (header.indexOf("계열") !== -1 || header.indexOf("분야") !== -1 || header.indexOf("track") !== -1) {
      if (colIndices.track === -1) colIndices.track = idx;
    } else if (header.indexOf("참고1") !== -1 || header.indexOf("ref1") !== -1 || header.indexOf("비고1") !== -1) {
      if (colIndices.ref1 === -1) colIndices.ref1 = idx;
    } else if (header.indexOf("참고2") !== -1 || header.indexOf("ref2") !== -1 || header.indexOf("비고2") !== -1) {
      if (colIndices.ref2 === -1) colIndices.ref2 = idx;
    } else if (header.indexOf("참고3") !== -1 || header.indexOf("ref3") !== -1 || header.indexOf("비고3") !== -1) {
      if (colIndices.ref3 === -1) colIndices.ref3 = idx;
    } else if (header.indexOf("참고4") !== -1 || header.indexOf("ref4") !== -1 || header.indexOf("비고4") !== -1) {
      if (colIndices.ref4 === -1) colIndices.ref4 = idx;
    } else if (header.indexOf("참고5") !== -1 || header.indexOf("ref5") !== -1 || header.indexOf("비고5") !== -1) {
      if (colIndices.ref5 === -1) colIndices.ref5 = idx;
    }
  });
  
  // 헤더 탐색이 실패했을 경우, 인덱스 충돌 없이 순차 백업 매핑
  var assigned = [];
  Object.keys(colIndices).forEach(function(k) {
    if (colIndices[k] !== -1) {
      assigned.push(colIndices[k]);
    }
  });
  
  function findNextUnassignedIdx() {
    for (var j = 0; j < headers.length; j++) {
      if (assigned.indexOf(j) === -1) {
        return j;
      }
    }
    return -1;
  }
  
  // 타임스탬프가 실제로 없을 때는 submittedAt을 백업 강제 매핑하지 않습니다. (학번이 겹쳐 보이는 현상 방지)
  // 나머지 핵심 열들에 대해서만 순서대로 백업 처리
  if (colIndices.stuNo === -1) {
    var backup = findNextUnassignedIdx();
    if (backup !== -1) { colIndices.stuNo = backup; assigned.push(backup); }
  }
  if (colIndices.name === -1) {
    var backup = findNextUnassignedIdx();
    if (backup !== -1) { colIndices.name = backup; assigned.push(backup); }
  }
  if (colIndices.dept1 === -1) {
    var backup = findNextUnassignedIdx();
    if (backup !== -1) { colIndices.dept1 = backup; assigned.push(backup); }
  }
  if (colIndices.dept2 === -1) {
    var backup = findNextUnassignedIdx();
    if (backup !== -1) { colIndices.dept2 = backup; assigned.push(backup); }
  }
  if (colIndices.careersRaw === -1) {
    var backup = findNextUnassignedIdx();
    if (backup !== -1) { colIndices.careersRaw = backup; assigned.push(backup); }
  }
  if (colIndices.track === -1) {
    var backup = findNextUnassignedIdx();
    if (backup !== -1) { colIndices.track = backup; assigned.push(backup); }
  }
  if (colIndices.ref1 === -1) {
    var backup = findNextUnassignedIdx();
    if (backup !== -1) { colIndices.ref1 = backup; assigned.push(backup); }
  }
  if (colIndices.ref2 === -1) {
    var backup = findNextUnassignedIdx();
    if (backup !== -1) { colIndices.ref2 = backup; assigned.push(backup); }
  }
  if (colIndices.ref3 === -1) {
    var backup = findNextUnassignedIdx();
    if (backup !== -1) { colIndices.ref3 = backup; assigned.push(backup); }
  }
  if (colIndices.ref4 === -1) {
    var backup = findNextUnassignedIdx();
    if (backup !== -1) { colIndices.ref4 = backup; assigned.push(backup); }
  }
  if (colIndices.ref5 === -1) {
    var backup = findNextUnassignedIdx();
    if (backup !== -1) { colIndices.ref5 = backup; assigned.push(backup); }
  }
  
  var result = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    
    // 전체 필드가 공란인 유령 행 스킵
    var hasContent = false;
    for (var c = 0; c < row.length; c++) {
      if (String(row[c]).trim() !== "") {
        hasContent = true;
        break;
      }
    }
    if (!hasContent) continue;
    
    // 타임스탬프 자료형 가공
    var submittedAtValue = "";
    if (colIndices.submittedAt !== -1 && row[colIndices.submittedAt]) {
      var ts = row[colIndices.submittedAt];
      if (ts instanceof Date) {
        submittedAtValue = Utilities.formatDate(ts, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      } else {
        submittedAtValue = String(ts).trim();
      }
    }
    
    var record = {
      submittedAt: submittedAtValue,
      stuNo: colIndices.stuNo !== -1 && row[colIndices.stuNo] !== undefined ? String(row[colIndices.stuNo]).trim() : "",
      name: colIndices.name !== -1 && row[colIndices.name] !== undefined ? String(row[colIndices.name]).trim() : "",
      dept1: colIndices.dept1 !== -1 && row[colIndices.dept1] !== undefined ? String(row[colIndices.dept1]).trim() : "",
      dept2: colIndices.dept2 !== -1 && row[colIndices.dept2] !== undefined ? String(row[colIndices.dept2]).trim() : "",
      careersRaw: colIndices.careersRaw !== -1 && row[colIndices.careersRaw] !== undefined ? String(row[colIndices.careersRaw]).trim() : "",
      track: colIndices.track !== -1 && row[colIndices.track] !== undefined ? String(row[colIndices.track]).trim() : "미등록",
      ref1: colIndices.ref1 !== -1 && row[colIndices.ref1] !== undefined ? String(row[colIndices.ref1]).trim() : "",
      ref2: colIndices.ref2 !== -1 && row[colIndices.ref2] !== undefined ? String(row[colIndices.ref2]).trim() : "",
      ref3: colIndices.ref3 !== -1 && row[colIndices.ref3] !== undefined ? String(row[colIndices.ref3]).trim() : "",
      ref4: colIndices.ref4 !== -1 && row[colIndices.ref4] !== undefined ? String(row[colIndices.ref4]).trim() : "",
      ref5: colIndices.ref5 !== -1 && row[colIndices.ref5] !== undefined ? String(row[colIndices.ref5]).trim() : ""
    };
    
    // 학번이나 이름이 기재되었을 때만 안정적 레코드로 판단 및 적재
    if (record.stuNo || record.name) {
      result.push(record);
    }
  }
  
  return result;
}

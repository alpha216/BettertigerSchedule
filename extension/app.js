async function fetchProfessorData(name) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "fetchProfessorData",
        profName: name
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("RMP Error (message passing):", chrome.runtime.lastError.message);
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (response && response.success) {
          resolve(response.data);
        } else {
          console.warn("RMP Warning (background fetch):", response ? response.error : `No data for ${name}`);
          resolve(null); // 데이터를 못찾거나 에러가 나도 다른 교수 정보는 계속 처리하도록 null 반환
        }
      }
    );
  });
}

async function findAllDivs() {
  const instructorDivs = document.querySelectorAll('div.rightnclear[title="Instructor(s)"]');
  for (const div of instructorDivs) {
    const originalName = div.textContent.trim();
    if (!originalName) continue;

    try {
      const prof = await fetchProfessorData(originalName);
      // console.log("gathing completed");
      // console.warn(prof);
      if (prof) {
        const rating = prof.avgRating ?? 'N/A';
        const difficulty = prof.avgDifficulty ?? 'N/A';
        div.textContent = `${originalName} / R: ${rating} / D: ${difficulty}`;
      }
    } catch (err) {
      console.error('Error fetching RMP data for', originalName, err);
    }
  }
}


// 최초 실행
window.addEventListener('load', () => {
  setTimeout(findAllDivs, 1500);
});

const legendBox = document.getElementsByClassName('legend_box');

let observer = new MutationObserver(() => {
findAllDivs();
});

observer.observe(legendBox, {
        attributes: true,          // 요소의 속성 변경을 감지할지 (예: class, style, data-* 등)
        attributeOldValue: true,   // attributes가 true일 때, 변경 전 속성 값을 기록할지

        childList: true,           // 직계 자식 요소의 추가 또는 제거를 감지할지

        subtree: true,             // 대상 노드뿐만 아니라 그 자손 노드들(하위 모든 요소)의 변경까지 감지할지
                                   // (childList나 characterData를 자손에게도 적용하려면 필요)

        characterData: true,       // 텍스트 노드의 내용 변경(characterData)을 감지할지
        characterDataOldValue: true // characterData가 true일 때, 변경 전 텍스트 값을 기록할지
});
  
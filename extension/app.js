
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
          resolve(null);
        }
      }
    );
  });
}

// 전역 MutationObserver 인스턴스
let mainObserver;
// 실제로 감시할 DOM 노드
let observedNode;

const observerConfig = {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true,
    // attributeOldValue: true, // 콜백에서 이전 값을 사용한다면 true로 설정
    // characterDataOldValue: true // 콜백에서 이전 값을 사용한다면 true로 설정
};

async function findAllDivsAndUpdateDOM() {
    console.log("findAllDivsAndUpdateDOM: Started.");
    const instructorDivs = document.querySelectorAll('div.rightnclear[title="Instructor(s)"]');
    
    const tasks = [];

    for (const div of instructorDivs) {
        // 이미 처리된 div는 건너뛰기 (선택적: 강제 재처리 플래그가 없다면)
        if (div.dataset.rmpProcessed === 'true' && !div.dataset.rmpForceReprocess) {
            continue;
        }

        // 평점 정보가 이미 추가된 경우, 원래 이름만 추출
        // 예: "교수이름 / R: 4.0 / D: 3.0" 에서 "교수이름" 만 가져오기
        const currentText = div.textContent.trim();
        const originalName = currentText.split(" / R:")[0].trim();

        if (!originalName || originalName.toLowerCase() === 'staff' || originalName.toLowerCase() === 'tba') {
            div.dataset.rmpProcessed = 'true'; // 처리된 것으로 표시 (건너뛰는 경우도)
            delete div.dataset.rmpForceReprocess;
            continue;
        }
        
        // 각 div에 대한 처리를 비동기 작업으로 만듦
        tasks.push((async () => {
            try {
                // console.log(`findAllDivsAndUpdateDOM: ${originalName} 교수 정보 가져오는 중...`);
                const prof = await fetchProfessorData(originalName);
                if (prof) {
                    const rating = prof.avgRating !== null && prof.avgRating !== undefined ? prof.avgRating.toFixed(1) : 'N/A';
                    const difficulty = prof.avgDifficulty !== null && prof.avgDifficulty !== undefined ? prof.avgDifficulty.toFixed(1) : 'N/A';
                    div.textContent = `${originalName} / R: ${rating} / D: ${difficulty}`;
                } else {
                    // 평점 정보가 없을 경우 (선택: N/A로 표시하거나, 그냥 두거나)
                    // div.textContent = `${originalName} / R: N/A / D: N/A`;
                    console.log(`findAllDivsAndUpdateDOM: ${originalName} 교수 정보 없음.`);
                }
            } catch (err) {
                console.error('findAllDivsAndUpdateDOM: Error fetching RMP data for', originalName, err);
                // 에러 발생 시 (선택: 에러 표시 또는 그냥 두기)
                // div.textContent = `${originalName} / R: Error / D: Error`;
            } finally {
                div.dataset.rmpProcessed = 'true'; // 성공이든 실패든 처리된 것으로 표시
                delete div.dataset.rmpForceReprocess; // 강제 재처리 플래그 제거
            }
        })());
    }

    // 모든 비동기 작업이 완료될 때까지 기다림
    await Promise.allSettled(tasks);
    console.log("findAllDivsAndUpdateDOM: 모든 작업 완료.");
}

// MutationObserver 콜백 함수
async function mutationCallback(mutationsList, currentObserver) {
    // console.log("mutationCallback: 변경 감지됨", mutationsList);

    // 여기에 mutationsList를 검사해서 정말 우리가 관심 있는 변경인지 확인할 수 있어.
    // 예를 들어, 우리가 직접 추가한 data-rmp-processed 속성 변경은 무시할 수 있지.
    // 하지만 지금은 disconnect/reconnect 전략으로 충분해.

    // 1. 감시 중단
    currentObserver.disconnect();
    console.log("mutationCallback: Observer 연결 해제됨.");

    // 2. DOM 업데이트 함수 실행
    await findAllDivsAndUpdateDOM();

    // 3. 다시 감시 시작 (observedNode가 여전히 유효한지 확인)
    if (observedNode && document.body.contains(observedNode)) {
        currentObserver.observe(observedNode, observerConfig);
        console.log("mutationCallback: Observer 다시 연결됨.");
    } else {
        console.warn("mutationCallback: 감시 대상 노드가 사라졌거나 유효하지 않아 Observer를 다시 연결할 수 없습니다.");
    }
}

// 최초 실행 및 Observer 설정
window.addEventListener('load', () => {
  setTimeout(async () => {
    // 페이지 로드 후 첫 번째 DOM 업데이트 실행
    await findAllDivsAndUpdateDOM();

    // 감시 대상 노드 선택 ('.crn_value' 클래스를 가진 첫 번째 요소)
    // 만약 ID라면 document.getElementById('someId') 사용
    observedNode = document.getElementById('legend_box');

    if (observedNode) {
      mainObserver = new MutationObserver(mutationCallback);
      mainObserver.observe(observedNode, observerConfig);
      console.log("Initial", observedNode);
    } else {
      console.warn("Can't Find the observed node (legend_box).");
    }
  }, 1500); // 페이지 로딩 및 초기 스크립트 실행을 위한 약간의 지연
});
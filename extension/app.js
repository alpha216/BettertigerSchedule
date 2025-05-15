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

function updateDiv(prof, div) {
  const rating = prof.avgRating ?? 'N/A';
  const difficulty = prof.avgDifficulty ?? 'N/A';
  div.textContent = `${div.textContent.trim()} / R: ${rating} / D: ${difficulty} / W: ${Math.ceil(prof.wouldTakeAgainPercent) ?? 'N/A'}%`;
  if(prof.avgRating >= 4.0) {
    div.style.backgroundColor = '#BAD8B6';
  }
  else if(prof.avgRating >= 3.0) {
    div.style.backgroundColor = '#FBF3B9';
  }
  else if(prof.avgRating < 3.0) {
    div.style.backgroundColor = '#ffa9a9';
  }
  div.style.cursor = 'pointer';
  div.addEventListener('click', function() {
    window.open('https://www.ratemyprofessors.com/professor/'+prof.legacyId, '_blank');
  });
};

async function findAllDivs() {
  const instructorDivs = document.querySelectorAll('div.rightnclear[title="Instructor(s)"]');
  for (const div of instructorDivs) {
    const originalName = div.textContent.trim();
    if (originalName.includes(' / R:')) continue; // If rate exist, Do not repeat
    if (!originalName) continue;

    try {
      const res = await fetchProfessorData(originalName.replace(", ", " "));
      const prof = res[0].node
      const first = originalName.split(", ")[1]
      const last = originalName.split(", ")[0]
      if(!originalName.includes(prof.firstName) || !originalName.includes(prof.lastName)) {
        if(!(prof.firstName + prof.lastName).includes(first) || !(prof.firstName + prof.lastName).includes(last)){
          console.log('Name mismatch:', originalName, prof.firstName, prof.lastName);
          // injectModals(div, res);
          continue; // 이름이 일치하지 않으면 건너뛰기
        }
      }
      if (prof) {
        updateDiv(prof, div);
      }
    } catch (err) {
      console.error('Error fetching RMP data for', originalName, err);
    }
  }
}

//Initial Start
window.addEventListener('load', () => {
  setTimeout(findAllDivs, 1500);
});

const legendBox = document.getElementById('legend_box');

let observer = new MutationObserver(() => {
  console.log('DOM changed');
  findAllDivs();
});

observer.observe(legendBox, {
        attributes: true,          
        attributeOldValue: true,  

        childList: true,           

        // subtree: true,             

        characterData: true,       
        characterDataOldValue: true 
});
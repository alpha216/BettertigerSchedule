const query = `query NewSearchTeachersQuery(
    $query: TeacherSearchQuery!
    $count: Int
    $includeCompare: Boolean!
  ) {
    newSearch {
      teachers(query: $query, first: $count) {
        edges {
          node {
            avgRating
            avgDifficulty
          }
        }
      }
    }
  }`;

async function fetchProfessorData(name) {
  const variables = {
    query: {
      text: name,
      schoolID: "U2Nob29sLTYw"
    },
    count: 1,
    includeCompare: true
  };

  const response = await fetch('https://api.ratemyprofessors.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });
  const json = await response.json();
  const edges = json.data.newSearch.teachers.edges;
  if (!edges || edges.length === 0) return null;
  return edges[0].node;
}

function findAllDivs() {
  const instructorDivs = document.querySelectorAll('div.rightnclear[title="Instructor(s)"]');
  console.log(instructorDivs)
  for (const div of instructorDivs) {
    const originalName = div.textContent.trim();
    if (!originalName) continue;
    console.log(originalName)

    try {
      const prof = fetchProfessorData(originalName);
      if (prof) {
        const rating = prof.avgRating ?? 'N/A';
        const difficulty = prof.avgDifficulty ?? 'N/A';
        div.textContent = `${originalName} / R:${rating} / D:${difficulty}`;
      }
    } catch (err) {
      console.error('Error fetching RMP data for', originalName, err);
    }
  }
}

// html 동적 변경 감지
// let observer = new MutationObserver(() => {
//   findAllDivs();
// });
// observer.observe(document.body, { childList: true, subtree: true });

// 최초 실행
window.addEventListener('load', () => {
  setTimeout(findAllDivs, 1500);
});
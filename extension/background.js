
const GQL_QUERY = `query NewSearchTeachersQuery(
  $query: TeacherSearchQuery!
  $count: Int
) {
  newSearch {
    teachers(query: $query, first: $count) {
      didFallback
      edges {
        node {
          id
          legacyId
          avgRating
          avgDifficulty
          wouldTakeAgainPercent
          firstName
          lastName
          department
          departmentId
          courseCodes {
            courseCount
            courseName
          }
        }
      }
    }
  }
}
`;

async function fetchProfessorDataFromAPI(profName) {
  const variables = {
    query: {
      text: profName,
      schoolID: "U2Nob29sLTYw" // Auburn University의 RMP 학교 ID
    },
    count: 3, // 가장 일치하는 교수 1명 정보만 가져오기
    includeCompare: true
  };

  try {
    const response = await fetch('https://api.ratemyprofessors.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: GQL_QUERY, variables })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`RMP API request failed for "${profName}" with status ${response.status}: ${errorBody}`);
      throw new Error(`API request failed: ${response.status}`);
    }

    const json = await response.json();

    if (json.errors) {
      console.error(`RMP API returned GraphQL errors for "${profName}":`, json.errors);
      throw new Error(`GraphQL error from RMP API`);
    }
    
    const edges = json.data?.newSearch?.teachers?.edges;
    if (!edges || edges.length === 0) {
      console.log(`No RMP data found for "${profName}"`);
      return null;
    }
    return edges;
  } catch (error) {
    console.error('Error fetching RMP data in background for', profName, ':', error);
    throw error; // 에러를 다시 던져서 메시지 핸들러에서 잡도록 함
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchProfessorData") {
    fetchProfessorDataFromAPI(request.profName)
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; 
  }
});
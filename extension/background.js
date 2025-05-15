
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
          avgRating
          avgDifficulty
          firstName
          lastName
          department
          departmentId
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
    count: 1, // 가장 일치하는 교수 1명 정보만 가져오기
    includeCompare: true
  };

  try {
    // 참고: RateMyProfessors API는 가끔 'Authorization' 헤더를 요구할 수 있어.
    // 만약 요청이 계속 실패하면 (예: 401, 403 오류), 이 부분을 확인해야 할 수도 있어.
    // 현재는 공식적인 공개 API 토큰 발급 방법이 명확하지 않아서 일단 없이 시도해볼게.
    const response = await fetch('https://api.ratemyprofessors.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Basic YOUR_BASE64_ENCODED_TOKEN' // 필요하다면 여기에 토큰 추가
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
    return edges[0].node;
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
    return true; // 비동기적으로 응답을 보낼 것임을 알림
  }
});
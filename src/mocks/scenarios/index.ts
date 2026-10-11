import {
  AgentEvent,
  AgentReply,
  Campus,
  ChatMessage,
  RoomView,
  SearchFilterPatch,
  SearchFilters,
} from '@/domain/contracts';
import { executeSearch } from '@/features/search/utils/filterEngine';

export interface ScenarioRunInput {
  threadId: string;
  userMessage: string;
  currentFilters: SearchFilters;
  rooms: RoomView[];
  campuses: Campus[];
}

export function matchAndExecuteScenario({
  threadId,
  userMessage,
  currentFilters,
  rooms,
  campuses,
}: ScenarioRunInput): AgentReply {
  const norm = userMessage.toLowerCase().trim();
  const runId = `run-${Date.now()}`;
  const now = new Date().toISOString();

  let filterPatch: SearchFilterPatch = {};
  let status: AgentReply['status'] = 'completed';
  let clarificationQuestion: string | null = null;
  let responseText = '';
  let referencedRoomIds: string[] = [];
  let isFailure = false;

  // S06: "Tìm phòng gần trường mình" (Thiếu campus)
  if (
    norm.includes('gần trường mình') ||
    norm.includes('gần trường tôi') ||
    (norm.startsWith('tìm phòng') && !norm.includes('bách khoa') && !norm.includes('dĩ an') && !norm.includes('quận') && !currentFilters.campusId)
  ) {
    status = 'needs_clarification';
    clarificationQuestion =
      'Bạn muốn tìm phòng gần cơ sở nào của trường? Hiện tại hệ thống có dữ liệu mẫu cho Bách Khoa cơ sở Lý Thường Kiệt (Quận 10) và Bách Khoa cơ sở Dĩ An.';
    responseText = clarificationQuestion;
  }
  // S07: "Dưới 1 triệu, có điều hòa, nuôi mèo, dưới 500m" (Zero result test)
  else if (
    (norm.includes('dưới 1 triệu') || norm.includes('1tr')) &&
    (norm.includes('điều hòa') || norm.includes('máy lạnh')) &&
    (norm.includes('nuôi mèo') || norm.includes('thú cưng'))
  ) {
    filterPatch = {
      maxPriceVnd: 1000000,
      maxDistanceKm: 0.5,
      requiredAmenities: Array.from(new Set([...currentFilters.requiredAmenities, 'air_conditioner'])),
      petAllowed: true,
      campusId: currentFilters.campusId || 'hcmut-ltk',
    };
    responseText =
      'Chưa có phòng mẫu nào đáp ứng đồng thời cả ngân sách ≤ 1 triệu, có máy lạnh, nuôi mèo và cách trường ≤ 500m. Bạn thử tăng ngân sách hoặc mở rộng bán kính tìm kiếm nhé.';
  }
  // S09: "So sánh phòng 01 và 02"
  else if (
    (norm.includes('so sánh') || norm.includes('compare')) &&
    (norm.includes('01') || norm.includes('1')) &&
    (norm.includes('02') || norm.includes('2'))
  ) {
    referencedRoomIds = ['demo-room-01', 'demo-room-02'];
    responseText =
      'Mình đã lập bảng so sánh đối chiếu giữa demo-room-01 (2.8tr, 22m², có ban công, được nuôi pet) và demo-room-02 (3.2tr, 26m², studio, không nuôi pet).';
  }
  // S08: "Cho mình xem phòng demo-room-01"
  else if (norm.includes('demo-room-01') || norm.includes('phòng 01') || norm.includes('phòng 1')) {
    referencedRoomIds = ['demo-room-01'];
    responseText =
      'Đây là thông tin phòng demo-room-01: Phòng trọ ban công thoáng mát gần Bách Khoa (2.800.000 ₫/tháng, ~1.1 km). Bạn có thể bấm vào thẻ phòng bên cạnh để xem chi tiết đầy đủ.';
  }
  // S10: "Phòng nào gần nhất?"
  else if (norm.includes('gần nhất') || norm.includes('khoảng cách gần')) {
    filterPatch = {
      sortBy: 'distance_asc',
      campusId: currentFilters.campusId || 'hcmut-ltk',
    };
    responseText =
      'Mình đã sắp xếp danh sách phòng theo khoảng cách đường chim bay gần trường nhất lên đầu.';
  }
  // S11: "Có phòng nào hết hạn không?"
  else if (norm.includes('hết hạn') || norm.includes('còn phòng') || norm.includes('tình trạng phòng')) {
    responseText =
      'Toàn bộ danh sách trong giai đoạn thử nghiệm này là dữ liệu mô phỏng (Demo). Trạng thái tin đăng là "Chưa rõ" (Unknown) và chưa được xác minh thời gian thực. Hệ thống không cam kết phòng còn trống.';
  }
  // S05: "Bỏ máy lạnh đi"
  else if (norm.includes('bỏ máy lạnh') || norm.includes('không cần máy lạnh') || norm.includes('bỏ điều hòa')) {
    filterPatch = {
      requiredAmenities: currentFilters.requiredAmenities.filter((a) => a !== 'air_conditioner'),
    };
    responseText = 'Đã bỏ yêu cầu máy lạnh khỏi bộ lọc tìm kiếm.';
  }
  // S04: "Tăng ngân sách lên 3,5 triệu"
  else if (
    norm.includes('tăng ngân sách') ||
    norm.includes('3,5 triệu') ||
    norm.includes('3.5 triệu') ||
    norm.includes('3.5tr')
  ) {
    filterPatch = {
      maxPriceVnd: 3500000,
    };
    responseText =
      'Đã nâng mức ngân sách tối đa lên 3.500.000 ₫/tháng. Các tiêu chí khác (trường, khoảng cách, tiện ích) vẫn được giữ nguyên.';
  }
  // S03: "Cho nuôi mèo"
  else if (norm.includes('nuôi mèo') || norm.includes('nuôi chó') || norm.includes('thú cưng')) {
    filterPatch = {
      petAllowed: true,
    };
    responseText =
      'Đã lọc thêm tiêu chí cho phép nuôi thú cưng. Các tiêu chí trước đó vẫn được giữ nguyên.';
  }
  // S02: "Có máy lạnh nữa"
  else if (norm.includes('máy lạnh') || norm.includes('điều hòa')) {
    filterPatch = {
      requiredAmenities: Array.from(new Set([...currentFilters.requiredAmenities, 'air_conditioner'])),
    };
    responseText =
      'Đã thêm yêu cầu có máy lạnh vào tiêu chí tìm kiếm. Bộ lọc và danh sách phòng đã được cập nhật.';
  }
  // S01: "Tìm phòng dưới 3 triệu quanh Bách Khoa Lý Thường Kiệt trong 2 km"
  else if (
    (norm.includes('3 triệu') || norm.includes('3tr')) &&
    (norm.includes('bách khoa') || norm.includes('lý thường kiệt') || norm.includes('ltk'))
  ) {
    filterPatch = {
      campusId: 'hcmut-ltk',
      maxPriceVnd: 3000000,
      maxDistanceKm: 2,
    };
    responseText =
      'Mình hiểu nhu cầu của bạn: tìm phòng ≤ 3 triệu, bán kính 2 km quanh Bách Khoa cơ sở Lý Thường Kiệt. Bạn có thể xem kết quả trực quan trên bản đồ hoặc điều chỉnh thêm bộ lọc.';
  }
  // Flexible price/campus parser for other conversational inputs
  else if (norm.includes('dĩ an')) {
    filterPatch = {
      campusId: 'hcmut-da',
    };
    responseText = 'Đã chuyển địa điểm tìm kiếm sang Bách Khoa cơ sở Dĩ An.';
  } else if (norm.includes('dưới 2 triệu') || norm.includes('2tr')) {
    filterPatch = {
      maxPriceVnd: 2000000,
      campusId: currentFilters.campusId || 'hcmut-ltk',
    };
    responseText = 'Đã cập nhật mức giá tối đa là 2.000.000 ₫/tháng.';
  } else if (norm.includes('test failure') || norm.includes('lỗi')) {
    isFailure = true;
    status = 'failed';
    responseText = 'Mô phỏng: Quá trình xử lý gặp lỗi. Vui lòng thử lại.';
  }
  // S12: Unrelated / unknown prompt
  else {
    status = 'needs_clarification';
    clarificationQuestion =
      'Mình là AI hỗ trợ tìm trọ sinh viên. Bạn có thể mô tả theo mẫu: "Tìm phòng dưới 3 triệu gần Bách Khoa Lý Thường Kiệt, có máy lạnh" hoặc chọn các gợi ý bên dưới.';
    responseText = clarificationQuestion;
  }

  // Calculate new effective filters
  const updatedFilters: SearchFilters = {
    ...currentFilters,
    ...filterPatch,
    requiredAmenities: filterPatch.requiredAmenities ?? currentFilters.requiredAmenities,
  };

  // Run search if not clarify/failed
  let searchResult = null;
  if (status === 'completed') {
    searchResult = executeSearch({
      rooms,
      campuses,
      filters: updatedFilters,
    });
    if (referencedRoomIds.length === 0 && searchResult.hits.length > 0) {
      referencedRoomIds = searchResult.hits.slice(0, 3).map((h) => h.roomId);
    }
  }

  // Generate simulated events
  const events: AgentEvent[] = [];
  events.push({
    id: `evt-${Date.now()}-1`,
    runId,
    type: 'run_started',
    status: 'success',
    label: 'Khởi tạo tác vụ tìm kiếm',
    timestamp: now,
    durationMs: 45,
    isSimulation: true,
    details: { userMessage, mode: 'mock_simulation' },
  });

  if (isFailure) {
    events.push({
      id: `evt-${Date.now()}-err`,
      runId,
      type: 'run_failed',
      status: 'error',
      label: 'Mô phỏng lỗi dịch vụ',
      timestamp: now,
      durationMs: 120,
      isSimulation: true,
      details: { reason: 'Simulated service failure' },
    });
  } else if (status === 'needs_clarification') {
    events.push({
      id: `evt-${Date.now()}-2`,
      runId,
      type: 'preferences_extracted',
      status: 'success',
      label: 'Phân tích câu hỏi người dùng',
      timestamp: now,
      durationMs: 65,
      isSimulation: true,
      details: { intent: 'clarify_or_help' },
    });
    events.push({
      id: `evt-${Date.now()}-3`,
      runId,
      type: 'clarification_required',
      status: 'success',
      label: 'Yêu cầu làm rõ thông tin',
      timestamp: now,
      durationMs: 30,
      isSimulation: true,
      details: { question: clarificationQuestion },
    });
  } else {
    // Normal successful pipeline events
    events.push({
      id: `evt-${Date.now()}-2`,
      runId,
      type: 'preferences_extracted',
      status: 'success',
      label: 'Trích xuất tiêu chí tìm kiếm',
      timestamp: now,
      durationMs: 80,
      isSimulation: true,
      details: {
      campusId: filterPatch.campusId ?? null,
      maxPriceVnd: filterPatch.maxPriceVnd ?? null,
      maxDistanceKm: filterPatch.maxDistanceKm ?? null,
      requiredAmenities: filterPatch.requiredAmenities?.join(', ') ?? null,
      petAllowed: filterPatch.petAllowed ?? null,
    },
    });
    events.push({
      id: `evt-${Date.now()}-3`,
      runId,
      type: 'campus_resolved',
      status: 'success',
      label: 'Xác định tọa độ cơ sở trường',
      timestamp: now,
      durationMs: 40,
      isSimulation: true,
      details: { campusId: updatedFilters.campusId ?? 'none' },
    });
    events.push({
      id: `evt-${Date.now()}-4`,
      runId,
      type: 'rooms_searched',
      status: 'success',
      label: 'Truy vấn danh sách phòng mẫu',
      timestamp: now,
      durationMs: 110,
      isSimulation: true,
      details: { totalAvailable: rooms.length },
    });
    events.push({
      id: `evt-${Date.now()}-5`,
      runId,
      type: 'distance_filtered',
      status: 'success',
      label: 'Tính khoảng cách đường chim bay (Haversine)',
      timestamp: now,
      durationMs: 60,
      isSimulation: true,
      details: { radiusKm: updatedFilters.maxDistanceKm },
    });
    events.push({
      id: `evt-${Date.now()}-6`,
      runId,
      type: 'rooms_ranked',
      status: 'success',
      label: 'Xếp hạng mức độ phù hợp',
      timestamp: now,
      durationMs: 75,
      isSimulation: true,
      details: { matchedCount: searchResult?.totalMatched ?? 0 },
    });
    events.push({
      id: `evt-${Date.now()}-7`,
      runId,
      type: 'response_ready',
      status: 'success',
      label: 'Tổng hợp câu trả lời cho người dùng',
      timestamp: now,
      durationMs: 50,
      isSimulation: true,
      details: { references: referencedRoomIds.join(', ') },
    });
    events.push({
      id: `evt-${Date.now()}-8`,
      runId,
      type: 'run_completed',
      status: 'success',
      label: 'Hoàn tất chu trình mô phỏng',
      timestamp: now,
      durationMs: 10,
      isSimulation: true,
      details: { status: 'success' },
    });
  }

  const message: ChatMessage = {
    id: `msg-${Date.now()}`,
    threadId,
    role: 'assistant',
    content: responseText,
    createdAt: now,
    referencedRoomIds,
  };

  return {
    runId,
    threadId,
    status,
    message,
    filterPatch,
    result: searchResult,
    events,
    clarificationQuestion,
    isSimulation: true,
  };
}

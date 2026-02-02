/**
 * 휴가/연차 관련 상수
 */

// 연차 유형별 차감 일수
export const LEAVE_TYPE_DAYS = {
    full: 1,        // 연차
    half_am: 0.5,   // 오전 반차
    half_pm: 0.5,   // 오후 반차
    out_1h: 0.125,  // 1시간 외출 (1/8일)
    out_2h: 0.25,   // 2시간 외출
    out_3h: 0.375,  // 3시간 외출
    comp: 1         // 대체휴무 (연차에서 차감하지 않음, comp_leaves에서 차감)
}

// 연차 유형 라벨
export const LEAVE_TYPE_LABELS = {
    full: '연차',
    half_am: '오전 반차',
    half_pm: '오후 반차',
    out_1h: '외출 1시간',
    out_2h: '외출 2시간',
    out_3h: '외출 3시간',
    comp: '대체휴무'
}

// 기본 연차 일수
export const DEFAULT_ANNUAL_LEAVE_DAYS = 15

// 근태 관련 문서 라벨 코드
export const ATTENDANCE_LABEL_CODE = 4

// 휴가 상태
export const LEAVE_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
}

// 휴가 상태 라벨
export const LEAVE_STATUS_LABELS = {
    pending: '대기중',
    approved: '승인',
    rejected: '반려'
}

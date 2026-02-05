import { useState, useEffect, useRef } from 'react'
import { Card, Button, Modal } from '../components/common'
import { Plus, Trash2, Edit2, AlertTriangle, Download, Camera, X, Image, Settings, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Search, Eye } from 'lucide-react'
import RescueDashboard from '../components/rescue/RescueDashboard'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import { uploadToDropbox, deleteFileByUrl } from '../lib/dropbox'

// 국가 코드 -> 국기 이모지 변환 (전세계)
const countryFlags = {
    // 아시아
    'KR': '🇰🇷', 'KP': '🇰🇵', 'JP': '🇯🇵', 'CN': '🇨🇳', 'TW': '🇹🇼',
    'HK': '🇭🇰', 'MO': '🇲🇴', 'MN': '🇲🇳', 'VN': '🇻🇳', 'TH': '🇹🇭',
    'PH': '🇵🇭', 'KH': '🇰🇭', 'LA': '🇱🇦', 'MM': '🇲🇲', 'MY': '🇲🇾',
    'SG': '🇸🇬', 'ID': '🇮🇩', 'BN': '🇧🇳', 'TL': '🇹🇱', 'IN': '🇮🇳',
    'PK': '🇵🇰', 'BD': '🇧🇩', 'LK': '🇱🇰', 'NP': '🇳🇵', 'BT': '🇧🇹',
    'MV': '🇲🇻', 'AF': '🇦🇫', 'KZ': '🇰🇿', 'UZ': '🇺🇿', 'KG': '🇰🇬',
    'TJ': '🇹🇯', 'TM': '🇹🇲',
    // 중동
    'IR': '🇮🇷', 'IQ': '🇮🇶', 'SY': '🇸🇾', 'LB': '🇱🇧', 'JO': '🇯🇴',
    'IL': '🇮🇱', 'PS': '🇵🇸', 'SA': '🇸🇦', 'AE': '🇦🇪', 'QA': '🇶🇦',
    'KW': '🇰🇼', 'BH': '🇧🇭', 'OM': '🇴🇲', 'YE': '🇾🇪', 'TR': '🇹🇷',
    // 유럽
    'GB': '🇬🇧', 'FR': '🇫🇷', 'DE': '🇩🇪', 'IT': '🇮🇹', 'ES': '🇪🇸',
    'PT': '🇵🇹', 'NL': '🇳🇱', 'BE': '🇧🇪', 'LU': '🇱🇺', 'CH': '🇨🇭',
    'AT': '🇦🇹', 'PL': '🇵🇱', 'CZ': '🇨🇿', 'SK': '🇸🇰', 'HU': '🇭🇺',
    'RO': '🇷🇴', 'BG': '🇧🇬', 'GR': '🇬🇷', 'HR': '🇭🇷', 'RS': '🇷🇸',
    'SI': '🇸🇮', 'BA': '🇧🇦', 'ME': '🇲🇪', 'MK': '🇲🇰', 'AL': '🇦🇱',
    'XK': '🇽🇰', 'UA': '🇺🇦', 'BY': '🇧🇾', 'MD': '🇲🇩', 'RU': '🇷🇺',
    'EE': '🇪🇪', 'LV': '🇱🇻', 'LT': '🇱🇹', 'FI': '🇫🇮', 'SE': '🇸🇪',
    'NO': '🇳🇴', 'DK': '🇩🇰', 'IS': '🇮🇸', 'IE': '🇮🇪', 'MT': '🇲🇹',
    'CY': '🇨🇾', 'GE': '🇬🇪', 'AM': '🇦🇲', 'AZ': '🇦🇿', 'MC': '🇲🇨',
    'AD': '🇦🇩', 'SM': '🇸🇲', 'VA': '🇻🇦',
    // 북미
    'US': '🇺🇸', 'CA': '🇨🇦', 'MX': '🇲🇽',
    // 중미/카리브
    'GT': '🇬🇹', 'BZ': '🇧🇿', 'SV': '🇸🇻', 'HN': '🇭🇳', 'NI': '🇳🇮',
    'CR': '🇨🇷', 'PA': '🇵🇦', 'CU': '🇨🇺', 'JM': '🇯🇲', 'HT': '🇭🇹',
    'DO': '🇩🇴', 'PR': '🇵🇷', 'BS': '🇧🇸', 'TT': '🇹🇹', 'BB': '🇧🇧',
    // 남미
    'BR': '🇧🇷', 'AR': '🇦🇷', 'CL': '🇨🇱', 'PE': '🇵🇪', 'CO': '🇨🇴',
    'VE': '🇻🇪', 'EC': '🇪🇨', 'BO': '🇧🇴', 'PY': '🇵🇾', 'UY': '🇺🇾',
    'GY': '🇬🇾', 'SR': '🇸🇷',
    // 오세아니아
    'AU': '🇦🇺', 'NZ': '🇳🇿', 'PG': '🇵🇬', 'FJ': '🇫🇯', 'WS': '🇼🇸',
    'TO': '🇹🇴', 'VU': '🇻🇺', 'SB': '🇸🇧', 'GU': '🇬🇺',
    // 아프리카
    'EG': '🇪🇬', 'LY': '🇱🇾', 'TN': '🇹🇳', 'DZ': '🇩🇿', 'MA': '🇲🇦',
    'ZA': '🇿🇦', 'NG': '🇳🇬', 'KE': '🇰🇪', 'ET': '🇪🇹', 'GH': '🇬🇭',
    'TZ': '🇹🇿', 'UG': '🇺🇬', 'ZW': '🇿🇼', 'MZ': '🇲🇿', 'AO': '🇦🇴',
    'CM': '🇨🇲', 'CI': '🇨🇮', 'SN': '🇸🇳', 'CD': '🇨🇩', 'CG': '🇨🇬',
    'SD': '🇸🇩', 'SS': '🇸🇸', 'SO': '🇸🇴', 'RW': '🇷🇼', 'MG': '🇲🇬',
    'MU': '🇲🇺', 'NA': '🇳🇦', 'BW': '🇧🇼', 'ZM': '🇿🇲', 'MW': '🇲🇼',
    'MR': '🇲🇷', 'ML': '🇲🇱', 'NE': '🇳🇪', 'TD': '🇹🇩', 'BF': '🇧🇫',
    'TG': '🇹🇬', 'BJ': '🇧🇯', 'LR': '🇱🇷', 'SL': '🇸🇱', 'GN': '🇬🇳',
    'GM': '🇬🇲', 'CV': '🇨🇻', 'DJ': '🇩🇯', 'ER': '🇪🇷'
}

// 국가 목록 (선택용) - 전세계
const countryList = [
    // 아시아
    { code: 'KR', name: '한국' }, { code: 'KP', name: '북한' }, { code: 'JP', name: '일본' },
    { code: 'CN', name: '중국' }, { code: 'TW', name: '대만' }, { code: 'HK', name: '홍콩' },
    { code: 'MO', name: '마카오' }, { code: 'MN', name: '몽골' }, { code: 'VN', name: '베트남' },
    { code: 'TH', name: '태국' }, { code: 'PH', name: '필리핀' }, { code: 'KH', name: '캄보디아' },
    { code: 'LA', name: '라오스' }, { code: 'MM', name: '미얀마' }, { code: 'MY', name: '말레이시아' },
    { code: 'SG', name: '싱가폴' }, { code: 'ID', name: '인도네시아' }, { code: 'BN', name: '브루나이' },
    { code: 'TL', name: '동티모르' }, { code: 'IN', name: '인도' }, { code: 'PK', name: '파키스탄' },
    { code: 'BD', name: '방글라데시' }, { code: 'LK', name: '스리랑카' }, { code: 'NP', name: '네팔' },
    { code: 'BT', name: '부탄' }, { code: 'MV', name: '몰디브' }, { code: 'AF', name: '아프가니스탄' },
    { code: 'KZ', name: '카자흐스탄' }, { code: 'UZ', name: '우즈베키스탄' }, { code: 'KG', name: '키르기스스탄' },
    { code: 'TJ', name: '타지키스탄' }, { code: 'TM', name: '투르크메니스탄' },
    // 중동
    { code: 'IR', name: '이란' }, { code: 'IQ', name: '이라크' }, { code: 'SY', name: '시리아' },
    { code: 'LB', name: '레바논' }, { code: 'JO', name: '요르단' }, { code: 'IL', name: '이스라엘' },
    { code: 'PS', name: '팔레스타인' }, { code: 'SA', name: '사우디아라비아' }, { code: 'AE', name: '아랍에미리트' },
    { code: 'QA', name: '카타르' }, { code: 'KW', name: '쿠웨이트' }, { code: 'BH', name: '바레인' },
    { code: 'OM', name: '오만' }, { code: 'YE', name: '예멘' }, { code: 'TR', name: '터키' },
    // 유럽
    { code: 'GB', name: '영국' }, { code: 'FR', name: '프랑스' }, { code: 'DE', name: '독일' },
    { code: 'IT', name: '이탈리아' }, { code: 'ES', name: '스페인' }, { code: 'PT', name: '포르투갈' },
    { code: 'NL', name: '네덜란드' }, { code: 'BE', name: '벨기에' }, { code: 'LU', name: '룩셈부르크' },
    { code: 'CH', name: '스위스' }, { code: 'AT', name: '오스트리아' }, { code: 'PL', name: '폴란드' },
    { code: 'CZ', name: '체코' }, { code: 'SK', name: '슬로바키아' }, { code: 'HU', name: '헝가리' },
    { code: 'RO', name: '루마니아' }, { code: 'BG', name: '불가리아' }, { code: 'GR', name: '그리스' },
    { code: 'HR', name: '크로아티아' }, { code: 'RS', name: '세르비아' }, { code: 'SI', name: '슬로베니아' },
    { code: 'BA', name: '보스니아' }, { code: 'ME', name: '몬테네그로' }, { code: 'MK', name: '북마케도니아' },
    { code: 'AL', name: '알바니아' }, { code: 'XK', name: '코소보' }, { code: 'UA', name: '우크라이나' },
    { code: 'BY', name: '벨라루스' }, { code: 'MD', name: '몰도바' }, { code: 'RU', name: '러시아' },
    { code: 'EE', name: '에스토니아' }, { code: 'LV', name: '라트비아' }, { code: 'LT', name: '리투아니아' },
    { code: 'FI', name: '핀란드' }, { code: 'SE', name: '스웨덴' }, { code: 'NO', name: '노르웨이' },
    { code: 'DK', name: '덴마크' }, { code: 'IS', name: '아이슬란드' }, { code: 'IE', name: '아일랜드' },
    { code: 'MT', name: '몰타' }, { code: 'CY', name: '키프로스' }, { code: 'GE', name: '조지아' },
    { code: 'AM', name: '아르메니아' }, { code: 'AZ', name: '아제르바이잔' }, { code: 'MC', name: '모나코' },
    { code: 'AD', name: '안도라' }, { code: 'SM', name: '산마리노' }, { code: 'VA', name: '바티칸' },
    // 북미
    { code: 'US', name: '미국' }, { code: 'CA', name: '캐나다' }, { code: 'MX', name: '멕시코' },
    // 중미/카리브
    { code: 'GT', name: '과테말라' }, { code: 'BZ', name: '벨리즈' }, { code: 'SV', name: '엘살바도르' },
    { code: 'HN', name: '온두라스' }, { code: 'NI', name: '니카라과' }, { code: 'CR', name: '코스타리카' },
    { code: 'PA', name: '파나마' }, { code: 'CU', name: '쿠바' }, { code: 'JM', name: '자메이카' },
    { code: 'HT', name: '아이티' }, { code: 'DO', name: '도미니카공화국' }, { code: 'PR', name: '푸에르토리코' },
    { code: 'BS', name: '바하마' }, { code: 'TT', name: '트리니다드토바고' }, { code: 'BB', name: '바베이도스' },
    // 남미
    { code: 'BR', name: '브라질' }, { code: 'AR', name: '아르헨티나' }, { code: 'CL', name: '칠레' },
    { code: 'PE', name: '페루' }, { code: 'CO', name: '콜롬비아' }, { code: 'VE', name: '베네수엘라' },
    { code: 'EC', name: '에콰도르' }, { code: 'BO', name: '볼리비아' }, { code: 'PY', name: '파라과이' },
    { code: 'UY', name: '우루과이' }, { code: 'GY', name: '가이아나' }, { code: 'SR', name: '수리남' },
    // 오세아니아
    { code: 'AU', name: '호주' }, { code: 'NZ', name: '뉴질랜드' }, { code: 'PG', name: '파푸아뉴기니' },
    { code: 'FJ', name: '피지' }, { code: 'WS', name: '사모아' }, { code: 'TO', name: '통가' },
    { code: 'VU', name: '바누아투' }, { code: 'SB', name: '솔로몬제도' }, { code: 'GU', name: '괌' },
    // 아프리카
    { code: 'EG', name: '이집트' }, { code: 'LY', name: '리비아' }, { code: 'TN', name: '튀니지' },
    { code: 'DZ', name: '알제리' }, { code: 'MA', name: '모로코' }, { code: 'ZA', name: '남아프리카공화국' },
    { code: 'NG', name: '나이지리아' }, { code: 'KE', name: '케냐' }, { code: 'ET', name: '에티오피아' },
    { code: 'GH', name: '가나' }, { code: 'TZ', name: '탄자니아' }, { code: 'UG', name: '우간다' },
    { code: 'ZW', name: '짐바브웨' }, { code: 'MZ', name: '모잠비크' }, { code: 'AO', name: '앙골라' },
    { code: 'CM', name: '카메룬' }, { code: 'CI', name: '코트디부아르' }, { code: 'SN', name: '세네갈' },
    { code: 'CD', name: '콩고민주공화국' }, { code: 'CG', name: '콩고' }, { code: 'SD', name: '수단' },
    { code: 'SS', name: '남수단' }, { code: 'SO', name: '소말리아' }, { code: 'RW', name: '르완다' },
    { code: 'MG', name: '마다가스카르' }, { code: 'MU', name: '모리셔스' }, { code: 'NA', name: '나미비아' },
    { code: 'BW', name: '보츠와나' }, { code: 'ZM', name: '잠비아' }, { code: 'MW', name: '말라위' },
    { code: 'MR', name: '모리타니' }, { code: 'ML', name: '말리' }, { code: 'NE', name: '니제르' },
    { code: 'TD', name: '차드' }, { code: 'BF', name: '부르키나파소' }, { code: 'TG', name: '토고' },
    { code: 'BJ', name: '베냉' }, { code: 'LR', name: '라이베리아' }, { code: 'SL', name: '시에라리온' },
    { code: 'GN', name: '기니' }, { code: 'GM', name: '감비아' }, { code: 'CV', name: '카보베르데' },
    { code: 'DJ', name: '지부티' }, { code: 'ER', name: '에리트레아' }
].sort((a, b) => a.name.localeCompare(b.name, 'ko'))

const RescuePage = () => {
    const { profile, isAdmin } = useAuth()
    const [rescueSituations, setRescueSituations] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [selectedRescue, setSelectedRescue] = useState(null)
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [uploading, setUploading] = useState(false)
    const photoInputRef = useRef(null)

    // 구조현황 통계 관련 상태
    const [countryStats, setCountryStats] = useState({ in_progress: [], completed: [] })
    const [summaryStats, setSummaryStats] = useState({ this_week: 0, this_month: 0, this_year: 0, total: 0 })
    const [referenceImage, setReferenceImage] = useState(null)
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
    const [isImageModalOpen, setIsImageModalOpen] = useState(false)
    const [showStatsSection, setShowStatsSection] = useState(true)
    const refImageInputRef = useRef(null)
    const [isDashboardOpen, setIsDashboardOpen] = useState(false)

    // 통계 편집 폼
    const [statsFormData, setStatsFormData] = useState({
        this_week: 0,
        this_month: 0,
        this_year: 0,
        total: 0,
        in_progress: [],
        completed: []
    })

    const [formData, setFormData] = useState({
        location: '',
        name: '',
        request_date: '',
        status: '',
        details: '',
        is_completed: false,
        photo_url: '',
        photo_file: null
    })

    useEffect(() => {
        fetchRescueSituations()
        fetchRescueStats()
        fetchReferenceImage()
    }, [])

    const fetchRescueSituations = async () => {
        try {
            const { data, error } = await supabase
                .from('rescue_situations')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            setRescueSituations(data || [])
        } catch (error) {
            console.error('Error fetching rescue situations:', error)
            alert('데이터 조회 실패: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    // 구조 통계 데이터 가져오기
    const fetchRescueStats = async () => {
        try {
            // 요약 통계
            const { data: summaryData, error: summaryError } = await supabase
                .from('rescue_summary_stats')
                .select('*')

            if (!summaryError && summaryData && summaryData.length > 0) {
                const summary = {}
                summaryData.forEach(item => {
                    summary[item.stat_key] = item.stat_value
                })
                setSummaryStats(summary)
            }

            // 국가별 통계
            const { data: countryData, error: countryError } = await supabase
                .from('rescue_country_stats')
                .select('*')
                .order('display_order', { ascending: true })

            if (!countryError && countryData) {
                const inProgress = countryData.filter(c => c.stat_type === 'in_progress')
                const completed = countryData.filter(c => c.stat_type === 'completed')
                setCountryStats({ in_progress: inProgress, completed })
            }
        } catch (error) {
            console.error('Error fetching rescue stats:', error)
        }
    }

    // 참고 이미지 가져오기
    const fetchReferenceImage = async () => {
        try {
            const { data } = await supabase
                .from('rescue_reference_images')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (data) {
                setReferenceImage(data)
            }
        } catch (error) {
            // 이미지가 없을 수 있음
        }
    }

    const resetForm = () => {
        setFormData({
            location: '',
            name: '',
            request_date: '',
            status: '',
            details: '',
            is_completed: false,
            photo_url: '',
            photo_file: null
        })
        setIsEditMode(false)
        setSelectedRescue(null)
    }

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드 가능합니다.')
                return
            }
            setFormData({ ...formData, photo_file: file })
        }
    }

    const removePhoto = () => {
        setFormData({ ...formData, photo_file: null, photo_url: '' })
        if (photoInputRef.current) {
            photoInputRef.current.value = ''
        }
    }

    const handleCreate = async () => {
        if (!formData.name || !formData.location) {
            alert('성명과 체류지는 필수 입력 항목입니다.')
            return
        }

        try {
            setUploading(true)
            let photoUrl = ''

            // 사진 업로드
            if (formData.photo_file) {
                const result = await uploadToDropbox(formData.photo_file, '/rescue')
                photoUrl = result.url
            }

            const { error } = await supabase
                .from('rescue_situations')
                .insert({
                    location: formData.location,
                    name: formData.name,
                    request_date: formData.request_date,
                    status: formData.status,
                    details: formData.details,
                    is_completed: formData.is_completed,
                    photo_url: photoUrl,
                    user_id: profile.user_id
                })

            if (error) throw error

            setIsModalOpen(false)
            resetForm()
            fetchRescueSituations()
            alert('구조현황이 저장되었습니다.')
        } catch (error) {
            console.error('Error creating rescue situation:', error)
            alert('구조현황 저장에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleEdit = async () => {
        if (!formData.name || !formData.location) {
            alert('성명과 체류지는 필수 입력 항목입니다.')
            return
        }

        try {
            setUploading(true)
            let photoUrl = formData.photo_url

            // 새 사진이 있으면 업로드
            if (formData.photo_file) {
                const result = await uploadToDropbox(formData.photo_file, '/rescue')
                photoUrl = result.url
            }

            const { error } = await supabase
                .from('rescue_situations')
                .update({
                    location: formData.location,
                    name: formData.name,
                    request_date: formData.request_date,
                    status: formData.status,
                    details: formData.details,
                    is_completed: formData.is_completed,
                    photo_url: photoUrl
                })
                .eq('id', selectedRescue.id)

            if (error) throw error

            setIsModalOpen(false)
            resetForm()
            fetchRescueSituations()
            alert('구조현황이 수정되었습니다.')
        } catch (error) {
            console.error('Error updating rescue situation:', error)
            alert('구조현황 수정에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (rescue) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        try {
            // Dropbox에서 사진 삭제
            if (rescue.photo_url) {
                await deleteFileByUrl(rescue.photo_url)
            }

            const { error } = await supabase
                .from('rescue_situations')
                .delete()
                .eq('id', rescue.id)

            if (error) throw error

            fetchRescueSituations()
            alert('삭제되었습니다.')
        } catch (error) {
            console.error('Error deleting rescue situation:', error)
            alert('삭제에 실패했습니다.')
        }
    }

    const toggleComplete = async (rescue) => {
        try {
            const { error } = await supabase
                .from('rescue_situations')
                .update({ is_completed: !rescue.is_completed })
                .eq('id', rescue.id)

            if (error) throw error
            fetchRescueSituations()
        } catch (error) {
            console.error('Error toggling complete:', error)
            alert('상태 변경에 실패했습니다.')
        }
    }

    const openEditModal = (rescue) => {
        setFormData({
            location: rescue.location || '',
            name: rescue.name || '',
            request_date: rescue.request_date || '',
            status: rescue.status || '',
            details: rescue.details || '',
            is_completed: rescue.is_completed || false,
            photo_url: rescue.photo_url || '',
            photo_file: null
        })
        setSelectedRescue(rescue)
        setIsEditMode(true)
        setIsModalOpen(true)
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openDetailModal = (rescue) => {
        setSelectedRescue(rescue)
        setIsDetailModalOpen(true)
    }

    // 완료되지 않은 항목을 먼저, 완료된 항목을 나중에 정렬
    const sortedRescueSituations = [...rescueSituations].sort((a, b) => {
        // 완료 여부로 먼저 정렬 (미완료가 위로)
        if (a.is_completed !== b.is_completed) {
            return a.is_completed ? 1 : -1
        }
        // 같은 완료 상태면 생성일 기준 내림차순
        return new Date(b.created_at) - new Date(a.created_at)
    })

    // 페이지네이션
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = sortedRescueSituations.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(sortedRescueSituations.length / itemsPerPage)

    const goToPage = (pageNumber) => {
        setCurrentPage(pageNumber)
    }

    // 선택 토글 함수
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    // 전체 선택/해제 (현재 페이지만)
    const toggleSelectAll = () => {
        const currentPageIds = currentItems.map(item => item.id)
        const allSelected = currentPageIds.every(id => selectedIds.has(id))

        setSelectedIds(prev => {
            const newSet = new Set(prev)
            if (allSelected) {
                currentPageIds.forEach(id => newSet.delete(id))
            } else {
                currentPageIds.forEach(id => newSet.add(id))
            }
            return newSet
        })
    }

    // Word 표로 다운로드
    const handleDownloadWord = async () => {
        if (selectedIds.size === 0) {
            alert('다운로드할 항목을 선택해주세요.')
            return
        }

        const selectedItems = rescueSituations.filter(item => selectedIds.has(item.id))

        // 테이블 행 생성
        const tableRows = [
            // 헤더 행
            new TableRow({
                tableHeader: true,
                children: [
                    new TableCell({
                        width: { size: 800, type: WidthType.DXA },
                        shading: { fill: 'E8F0FE' },
                        children: [new Paragraph({
                            children: [new TextRun({ text: 'No', bold: true })],
                            alignment: AlignmentType.CENTER
                        })]
                    }),
                    new TableCell({
                        width: { size: 2000, type: WidthType.DXA },
                        shading: { fill: 'E8F0FE' },
                        children: [new Paragraph({
                            children: [new TextRun({ text: '체류지', bold: true })],
                            alignment: AlignmentType.CENTER
                        })]
                    }),
                    new TableCell({
                        width: { size: 1500, type: WidthType.DXA },
                        shading: { fill: 'E8F0FE' },
                        children: [new Paragraph({
                            children: [new TextRun({ text: '성명', bold: true })],
                            alignment: AlignmentType.CENTER
                        })]
                    }),
                    new TableCell({
                        width: { size: 1500, type: WidthType.DXA },
                        shading: { fill: 'E8F0FE' },
                        children: [new Paragraph({
                            children: [new TextRun({ text: '구조요청', bold: true })],
                            alignment: AlignmentType.CENTER
                        })]
                    }),
                    new TableCell({
                        width: { size: 4200, type: WidthType.DXA },
                        shading: { fill: 'E8F0FE' },
                        children: [new Paragraph({
                            children: [new TextRun({ text: '상세 구조진행상황', bold: true })],
                            alignment: AlignmentType.CENTER
                        })]
                    }),
                ]
            }),
            // 데이터 행들
            ...selectedItems.map((item, index) =>
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({
                                text: String(index + 1),
                                alignment: AlignmentType.CENTER
                            })]
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: item.location || '-' })]
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: item.name || '-' })]
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: item.request_date || '-' })]
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: item.details || '-' })]
                        }),
                    ]
                })
            )
        ]

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: '구조현황', bold: true, size: 32 })],
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({ text: '' }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: tableRows,
                    }),
                ],
            }],
        })

        const blob = await Packer.toBlob(doc)
        const today = new Date().toISOString().split('T')[0]
        saveAs(blob, `구조현황_${today}.docx`)

        // 선택 초기화
        setSelectedIds(new Set())
    }

    // 통계 모달 열기
    const openStatsModal = () => {
        setStatsFormData({
            this_week: summaryStats.this_week || 0,
            this_month: summaryStats.this_month || 0,
            this_year: summaryStats.this_year || 0,
            total: summaryStats.total || 0,
            in_progress: countryStats.in_progress.map(c => ({ ...c })),
            completed: countryStats.completed.map(c => ({ ...c }))
        })
        setIsStatsModalOpen(true)
    }

    // 국가 검색 상태
    const [countrySearchText, setCountrySearchText] = useState({ in_progress: '', completed: '' })
    const [showCountryDropdown, setShowCountryDropdown] = useState({ in_progress: null, completed: null })

    // 국가 검색 필터
    const getFilteredCountries = (searchText) => {
        if (!searchText) return countryList
        const lowerSearch = searchText.toLowerCase()
        return countryList.filter(c =>
            c.name.toLowerCase().includes(lowerSearch) ||
            c.code.toLowerCase().includes(lowerSearch)
        )
    }

    // 국가 통계 추가 (검색으로)
    const addCountryStatWithSearch = (type, country) => {
        setStatsFormData(prev => ({
            ...prev,
            [type]: [...prev[type], { country_code: country.code, country_name: country.name, rescue_count: 0, stat_type: type }]
        }))
        setCountrySearchText(prev => ({ ...prev, [type]: '' }))
    }

    // 국가 통계 제거
    const removeCountryStat = (type, index) => {
        setStatsFormData(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }))
    }

    // 국가 통계 수정
    const updateCountryStat = (type, index, field, value) => {
        setStatsFormData(prev => {
            const updated = [...prev[type]]
            if (field === 'country_code') {
                const country = countryList.find(c => c.code === value)
                updated[index] = { ...updated[index], country_code: value, country_name: country?.name || value }
            } else {
                updated[index] = { ...updated[index], [field]: field === 'rescue_count' ? parseInt(value) || 0 : value }
            }
            return { ...prev, [type]: updated }
        })
    }

    // 국가 순서 변경
    const moveCountryStat = (type, index, direction) => {
        setStatsFormData(prev => {
            const updated = [...prev[type]]
            const newIndex = direction === 'up' ? index - 1 : index + 1
            if (newIndex < 0 || newIndex >= updated.length) return prev

            // 순서 교환
            const temp = updated[index]
            updated[index] = updated[newIndex]
            updated[newIndex] = temp

            return { ...prev, [type]: updated }
        })
    }

    // 검색 입력 후 엔터 처리
    const handleCountrySearchKeyDown = (e, type) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()

            // IME 조합 중이면 무시 (한글 입력 시 중복 방지)
            if (e.nativeEvent?.isComposing || e.isComposing) return

            const searchText = countrySearchText[type]
            if (!searchText) return

            const filtered = getFilteredCountries(searchText)
            if (filtered.length > 0) {
                addCountryStatWithSearch(type, filtered[0])
            }
        }
    }

    // 통계 저장
    const handleSaveStats = async () => {
        try {
            setUploading(true)

            // 요약 통계 저장
            for (const key of ['this_week', 'this_month', 'this_year', 'total']) {
                const { error: upsertError } = await supabase
                    .from('rescue_summary_stats')
                    .upsert({ stat_key: key, stat_value: statsFormData[key] || 0, updated_at: new Date().toISOString() }, { onConflict: 'stat_key' })
                if (upsertError) throw upsertError
            }

            // 기존 국가 통계 삭제
            const { error: deleteError } = await supabase
                .from('rescue_country_stats')
                .delete()
                .in('stat_type', ['in_progress', 'completed'])
            if (deleteError) throw deleteError

            // 새 국가 통계 삽입
            const allCountryStats = [
                ...statsFormData.in_progress.map((c, i) => ({ ...c, stat_type: 'in_progress', display_order: i })),
                ...statsFormData.completed.map((c, i) => ({ ...c, stat_type: 'completed', display_order: i }))
            ]

            if (allCountryStats.length > 0) {
                const { error: insertError } = await supabase.from('rescue_country_stats').insert(
                    allCountryStats.map(c => ({
                        country_code: c.country_code,
                        country_name: c.country_name,
                        rescue_count: c.rescue_count,
                        stat_type: c.stat_type,
                        display_order: c.display_order
                    }))
                )
                if (insertError) throw insertError
            }

            setIsStatsModalOpen(false)
            await fetchRescueStats()
            alert('통계가 저장되었습니다.')
        } catch (error) {
            console.error('Error saving stats:', error)
            alert('통계 저장에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    // 참고 이미지 업로드
    const handleRefImageUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        try {
            setUploading(true)
            const result = await uploadToDropbox(file, '/rescue/reference')

            // 기존 이미지 삭제
            if (referenceImage?.image_url) {
                await deleteFileByUrl(referenceImage.image_url)
                await supabase.from('rescue_reference_images').delete().eq('id', referenceImage.id)
            }

            // 새 이미지 저장
            const { data, error } = await supabase
                .from('rescue_reference_images')
                .insert({ image_url: result.url, title: '구조현황 참고 이미지' })
                .select()
                .single()

            if (error) throw error

            setReferenceImage(data)
            setIsImageModalOpen(false)
            alert('이미지가 업로드되었습니다.')
        } catch (error) {
            console.error('Error uploading reference image:', error)
            alert('이미지 업로드에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    // 참고 이미지 삭제
    const handleDeleteRefImage = async () => {
        if (!referenceImage) return
        if (!confirm('참고 이미지를 삭제하시겠습니까?')) return

        try {
            await deleteFileByUrl(referenceImage.image_url)
            await supabase.from('rescue_reference_images').delete().eq('id', referenceImage.id)
            setReferenceImage(null)
            alert('이미지가 삭제되었습니다.')
        } catch (error) {
            console.error('Error deleting reference image:', error)
            alert('이미지 삭제에 실패했습니다.')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card className="bg-gradient-to-r from-toss-blue to-blue-600 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-1">구조현황 관리</h2>
                        <p className="text-white/90">
                            {isAdmin ? '전체 구조현황을 관리할 수 있습니다' : '구조현황을 등록하고 관리하세요'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* 구조현황 통계 섹션 */}
            <Card padding="p-0">
                {/* 섹션 헤더 */}
                <div
                    className="flex items-center justify-between px-4 sm:px-6 py-4 bg-amber-50 border-b border-amber-100 cursor-pointer"
                    onClick={() => setShowStatsSection(!showStatsSection)}
                >
                    <div className="flex items-center gap-3">
                        <div>
                            <h3 className="font-bold text-toss-gray-900">26년 한인구조단 구조 통계</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsDashboardOpen(true); }}
                            className="p-2 text-toss-blue hover:bg-blue-100 rounded-lg transition-colors"
                            title="구조현황판 보기"
                        >
                            <Eye size={18} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); openStatsModal(); }}
                            className="p-2 text-toss-gray-600 hover:bg-amber-100 rounded-lg transition-colors"
                            title="통계 관리"
                        >
                            <Settings size={18} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsImageModalOpen(true); }}
                            className="p-2 text-toss-gray-600 hover:bg-amber-100 rounded-lg transition-colors"
                            title="참고 이미지"
                        >
                            <Image size={18} />
                        </button>
                        {showStatsSection ? <ChevronUp size={20} className="text-toss-gray-500" /> : <ChevronDown size={20} className="text-toss-gray-500" />}
                    </div>
                </div>

                {showStatsSection && (
                    <div className="p-4 sm:p-6 space-y-6">
                        {/* 요약 통계 */}
                        <div className="grid grid-cols-4 gap-3">
                            <div className="bg-white border-2 border-toss-gray-200 rounded-xl p-3 text-center">
                                <p className="text-xs text-toss-gray-500 mb-1">이번 주</p>
                                <p className="text-2xl font-bold text-toss-gray-900">{summaryStats.this_week || 0}<span className="text-sm font-normal ml-1">명</span></p>
                            </div>
                            <div className="bg-white border-2 border-toss-gray-200 rounded-xl p-3 text-center">
                                <p className="text-xs text-toss-gray-500 mb-1">이번 달</p>
                                <p className="text-2xl font-bold text-toss-gray-900">{summaryStats.this_month || 0}<span className="text-sm font-normal ml-1">명</span></p>
                            </div>
                            <div className="bg-white border-2 border-toss-gray-200 rounded-xl p-3 text-center">
                                <p className="text-xs text-toss-gray-500 mb-1">2026년도</p>
                                <p className="text-2xl font-bold text-toss-gray-900">{summaryStats.this_year || 0}<span className="text-sm font-normal ml-1">명</span></p>
                            </div>
                            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-center">
                                <p className="text-xs text-amber-600 mb-1">총 구조자</p>
                                <p className="text-2xl font-bold text-amber-600">{summaryStats.total || 0}<span className="text-sm font-normal ml-1">명</span></p>
                            </div>
                        </div>

                        {/* 국가별 통계 테이블 */}
                        {(countryStats.in_progress.length > 0 || countryStats.completed.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* 구조 진행 */}
                                {countryStats.in_progress.length > 0 && (
                                    <div className="border rounded-xl overflow-hidden">
                                        <div className="bg-blue-50 px-4 py-2 border-b">
                                            <span className="font-semibold text-blue-700">구조 진행</span>
                                            <span className="text-sm text-blue-500 ml-2">구조 요청자</span>
                                        </div>
                                        <div className="divide-y">
                                            {countryStats.in_progress.map((stat, idx) => (
                                                <div key={idx} className="flex items-center justify-between px-4 py-2 hover:bg-toss-gray-50">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{countryFlags[stat.country_code] || '🏳️'}</span>
                                                        <span className="text-sm text-toss-gray-700">{stat.country_name}</span>
                                                    </div>
                                                    <span className="font-semibold text-toss-gray-900">{stat.rescue_count} 명</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 구조 난항 */}
                                {countryStats.completed.length > 0 && (
                                    <div className="border rounded-xl overflow-hidden">
                                        <div className="bg-orange-50 px-4 py-2 border-b">
                                            <span className="font-semibold text-orange-700">구조 난항</span>
                                            <span className="text-sm text-orange-500 ml-2">구조 요청자</span>
                                        </div>
                                        <div className="divide-y">
                                            {countryStats.completed.map((stat, idx) => (
                                                <div key={idx} className="flex items-center justify-between px-4 py-2 hover:bg-toss-gray-50">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{countryFlags[stat.country_code] || '🏳️'}</span>
                                                        <span className="text-sm text-toss-gray-700">{stat.country_name}</span>
                                                    </div>
                                                    <span className="font-semibold text-toss-gray-900">{stat.rescue_count} 명</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 참고 이미지 */}
                        {referenceImage && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-toss-gray-500 mb-2">첨부사진 (참고용)</p>
                                <div className="relative">
                                    <img
                                        src={referenceImage.image_url}
                                        alt="구조현황 참고 이미지"
                                        className="w-full max-h-96 object-contain rounded-xl border bg-toss-gray-50 cursor-pointer"
                                        onClick={() => window.open(referenceImage.image_url, '_blank')}
                                    />
                                    {isAdmin && (
                                        <button
                                            onClick={handleDeleteRefImage}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                            title="이미지 삭제"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 통계/이미지가 없을 때 */}
                        {countryStats.in_progress.length === 0 && countryStats.completed.length === 0 && !referenceImage && (
                            <div className="text-center text-toss-gray-500 py-4">
                                {isAdmin ? '통계 관리 버튼을 눌러 국가별 통계를 추가하세요.' : '아직 등록된 통계가 없습니다.'}
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-toss-gray-900">구조현황</h1>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={handleDownloadWord} disabled={selectedIds.size === 0}>
                        <Download size={18} />
                        Word 다운로드 {selectedIds.size > 0 && `(${selectedIds.size})`}
                    </Button>
                    <Button onClick={openCreateModal}>
                        <Plus size={18} />
                        새 구조현황 등록
                    </Button>
                </div>
            </div>

            {/* Table */}
            <Card padding="p-0 sm:p-6">
                {loading ? (
                    <div className="text-center text-toss-gray-500 py-8">로딩 중...</div>
                ) : currentItems.length > 0 ? (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full table-fixed">
                                <thead className="bg-toss-blue/10 border-b-2 border-toss-blue/20">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-900 w-10">
                                            <input
                                                type="checkbox"
                                                checked={currentItems.length > 0 && currentItems.every(item => selectedIds.has(item.id))}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-900 w-14">No</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-900 w-28">체류지</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-900 w-20">성명</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-900 w-24">구조요청</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-900">현재 진행상황</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-900 w-20">완료</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-900 w-24">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-toss-gray-100">
                                    {currentItems.map((rescue, index) => (
                                        <tr
                                            key={rescue.id}
                                            className={`transition-colors cursor-pointer ${rescue.is_completed ? 'bg-toss-gray-50 hover:bg-toss-gray-100' : 'bg-orange-50/50 hover:bg-orange-100/50'} ${selectedIds.has(rescue.id) ? '!bg-blue-50' : ''}`}
                                            onClick={() => openDetailModal(rescue)}
                                        >
                                            <td className="px-4 py-3 text-center w-10" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(rescue.id)}
                                                    onChange={() => toggleSelect(rescue.id)}
                                                    className="w-4 h-4 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center text-toss-gray-600 w-14">
                                                {indexOfFirstItem + index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-toss-gray-900 w-28 truncate">{rescue.location || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-toss-gray-900 font-medium w-20 truncate">{rescue.name || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-toss-gray-700 w-24 truncate">{rescue.request_date || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-toss-gray-700 truncate">{rescue.status || '-'}</td>
                                            <td className="px-4 py-3 text-center w-20" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => toggleComplete(rescue)}
                                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                                                        rescue.is_completed
                                                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                            : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                                    }`}
                                                >
                                                    {rescue.is_completed ? '완료' : '진행중'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-center w-24" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => openEditModal(rescue)}
                                                        className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                                                        title="수정"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(rescue)}
                                                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                        title="삭제"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-toss-gray-100">
                            {currentItems.map((rescue, index) => (
                                <div
                                    key={rescue.id}
                                    className={`p-4 ${rescue.is_completed ? 'bg-toss-gray-50' : 'bg-orange-50/50'} ${selectedIds.has(rescue.id) ? '!bg-blue-50' : ''}`}
                                    onClick={() => openDetailModal(rescue)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(rescue.id)}
                                                onChange={() => toggleSelect(rescue.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-4 h-4 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer"
                                            />
                                            <span className="text-xs text-toss-gray-500">#{indexOfFirstItem + index + 1}</span>
                                            <span className="text-sm font-medium text-toss-gray-900">{rescue.name || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => toggleComplete(rescue)}
                                                className={`px-2 py-0.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                                                    rescue.is_completed
                                                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                        : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                                }`}
                                            >
                                                {rescue.is_completed ? '완료' : '진행중'}
                                            </button>
                                            <button
                                                onClick={() => openEditModal(rescue)}
                                                className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(rescue)}
                                                className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <p className="text-toss-gray-700">
                                            <span className="text-toss-gray-500 mr-1">체류지:</span>
                                            {rescue.location || '-'}
                                        </p>
                                        <p className="text-toss-gray-700">
                                            <span className="text-toss-gray-500 mr-1">구조요청:</span>
                                            {rescue.request_date || '-'}
                                        </p>
                                        <p className="text-toss-gray-700 line-clamp-1">
                                            <span className="text-toss-gray-500 mr-1">상황:</span>
                                            {rescue.status || '-'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-toss-gray-200">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded-lg text-sm font-medium text-toss-gray-700 hover:bg-toss-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    이전
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => goToPage(i + 1)}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                            currentPage === i + 1
                                                ? 'bg-toss-blue text-white'
                                                : 'text-toss-gray-700 hover:bg-toss-gray-100'
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 rounded-lg text-sm font-medium text-toss-gray-700 hover:bg-toss-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    다음
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center text-toss-gray-500 py-8">
                        등록된 구조현황이 없습니다
                    </div>
                )}
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    resetForm()
                }}
                title={isEditMode ? '구조현황 수정' : '새 구조현황 등록'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            체류지 *
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="체류지를 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            성명 *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="성명을 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            구조요청 일자
                        </label>
                        <input
                            type="text"
                            value={formData.request_date}
                            onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="예: 25.01.13"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            현재 진행상황 (간략)
                        </label>
                        <input
                            type="text"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="현재 진행상황을 간략히 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            상세 구조진행상황
                        </label>
                        <textarea
                            value={formData.details}
                            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                            rows={8}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent resize-none transition-all leading-relaxed"
                            placeholder="상세한 구조진행상황을 입력하세요"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_completed"
                            checked={formData.is_completed || false}
                            onChange={(e) => setFormData({ ...formData, is_completed: e.target.checked })}
                            className="w-5 h-5 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer"
                        />
                        <label htmlFor="is_completed" className="text-sm font-medium text-toss-gray-700 cursor-pointer">
                            완료 처리
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            사진 첨부 (1장)
                        </label>
                        <input
                            type="file"
                            ref={photoInputRef}
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            className="hidden"
                        />
                        {formData.photo_file || formData.photo_url ? (
                            <div className="relative">
                                <img
                                    src={formData.photo_file ? URL.createObjectURL(formData.photo_file) : formData.photo_url}
                                    alt="첨부 사진"
                                    className="w-full max-h-48 object-contain rounded-xl bg-toss-gray-50"
                                />
                                <button
                                    type="button"
                                    onClick={removePhoto}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                className="w-full py-8 border-2 border-dashed border-toss-gray-300 rounded-xl text-toss-gray-500 hover:border-toss-blue hover:text-toss-blue transition-colors flex flex-col items-center justify-center gap-2"
                            >
                                <Camera size={24} />
                                <span className="text-sm">클릭하여 사진 첨부</span>
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsModalOpen(false)
                                resetForm()
                            }}
                            className="flex-1"
                            disabled={uploading}
                        >
                            취소
                        </Button>
                        <Button
                            onClick={isEditMode ? handleEdit : handleCreate}
                            className="flex-1"
                            disabled={uploading}
                        >
                            {uploading ? '업로드 중...' : (isEditMode ? '수정하기' : '저장하기')}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false)
                    setSelectedRescue(null)
                }}
                title="구조현황 상세"
            >
                {selectedRescue && (
                    <div className="space-y-4">
                        {/* 상단: 정보 + 사진 */}
                        <div className="flex gap-4">
                            {/* 왼쪽: 기본 정보 */}
                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-toss-gray-500 mb-1">체류지</label>
                                        <p className="text-toss-gray-900">{selectedRescue.location || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-toss-gray-500 mb-1">성명</label>
                                        <p className="text-toss-gray-900 font-medium">{selectedRescue.name || '-'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-toss-gray-500 mb-1">구조요청 일자</label>
                                        <p className="text-toss-gray-900">{selectedRescue.request_date || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-toss-gray-500 mb-1">완료 여부</label>
                                        <p className={`font-medium ${selectedRescue.is_completed ? 'text-green-600' : 'text-orange-500'}`}>
                                            {selectedRescue.is_completed ? '완료' : '진행중'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 오른쪽: 사진 */}
                            {selectedRescue.photo_url && (
                                <div className="w-32 h-32 flex-shrink-0">
                                    <img
                                        src={selectedRescue.photo_url}
                                        alt="첨부 사진"
                                        className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(selectedRescue.photo_url, '_blank')}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-1">현재 진행상황 (간략)</label>
                            <p className="text-toss-gray-900">{selectedRescue.status || '-'}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-2">상세 구조진행상황</label>
                            <div className="bg-toss-gray-50 rounded-xl p-4 min-h-[150px] whitespace-pre-wrap text-toss-gray-900">
                                {selectedRescue.details || '상세 내용이 없습니다.'}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsDetailModalOpen(false)
                                    setSelectedRescue(null)
                                }}
                                className="flex-1"
                            >
                                닫기
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsDetailModalOpen(false)
                                    openEditModal(selectedRescue)
                                }}
                                className="flex-1"
                            >
                                수정하기
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* 통계 관리 모달 */}
            <Modal
                isOpen={isStatsModalOpen}
                onClose={() => setIsStatsModalOpen(false)}
                title="구조현황 통계 관리"
            >
                <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* 요약 통계 입력 */}
                    <div>
                        <h4 className="font-semibold text-toss-gray-700 mb-3">요약 통계</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-toss-gray-500 mb-1">이번 주</label>
                                <input
                                    type="number"
                                    value={statsFormData.this_week}
                                    onChange={(e) => setStatsFormData({ ...statsFormData, this_week: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-toss-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-toss-gray-500 mb-1">이번 달</label>
                                <input
                                    type="number"
                                    value={statsFormData.this_month}
                                    onChange={(e) => setStatsFormData({ ...statsFormData, this_month: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-toss-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-toss-gray-500 mb-1">2026년도</label>
                                <input
                                    type="number"
                                    value={statsFormData.this_year}
                                    onChange={(e) => setStatsFormData({ ...statsFormData, this_year: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-toss-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-toss-gray-500 mb-1">총 구조자</label>
                                <input
                                    type="number"
                                    value={statsFormData.total}
                                    onChange={(e) => setStatsFormData({ ...statsFormData, total: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-toss-blue"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 국가별 통계 - 좌우 배치 */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* 구조 진행 (좌측) */}
                        <div>
                            <h4 className="font-semibold text-blue-700 mb-3">구조 진행</h4>

                            {/* 국가 검색 입력 */}
                            <div className="relative mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-400" />
                                        <input
                                            type="text"
                                            value={countrySearchText.in_progress}
                                            onChange={(e) => setCountrySearchText(prev => ({ ...prev, in_progress: e.target.value }))}
                                            onKeyDown={(e) => handleCountrySearchKeyDown(e, 'in_progress')}
                                            onFocus={() => setShowCountryDropdown(prev => ({ ...prev, in_progress: true }))}
                                            onBlur={() => setTimeout(() => setShowCountryDropdown(prev => ({ ...prev, in_progress: false })), 200)}
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-300"
                                            placeholder="국가 검색"
                                        />
                                    </div>
                                </div>
                                {/* 검색 결과 드롭다운 */}
                                {showCountryDropdown.in_progress && countrySearchText.in_progress && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                        {getFilteredCountries(countrySearchText.in_progress).slice(0, 8).map(c => (
                                            <button
                                                key={c.code}
                                                onClick={() => addCountryStatWithSearch('in_progress', c)}
                                                className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-sm"
                                            >
                                                <span>{countryFlags[c.code]}</span>
                                                <span>{c.name}</span>
                                            </button>
                                        ))}
                                        {getFilteredCountries(countrySearchText.in_progress).length === 0 && (
                                            <div className="px-3 py-2 text-sm text-toss-gray-400">검색 결과 없음</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 추가된 국가 목록 */}
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {statsFormData.in_progress.map((stat, idx) => (
                                    <div key={idx} className="flex items-center gap-1 bg-blue-50 rounded-lg px-2 py-1.5">
                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                onClick={() => moveCountryStat('in_progress', idx, 'up')}
                                                disabled={idx === 0}
                                                className="p-0.5 text-toss-gray-400 hover:text-toss-gray-700 disabled:opacity-30"
                                            >
                                                <ArrowUp size={10} />
                                            </button>
                                            <button
                                                onClick={() => moveCountryStat('in_progress', idx, 'down')}
                                                disabled={idx === statsFormData.in_progress.length - 1}
                                                className="p-0.5 text-toss-gray-400 hover:text-toss-gray-700 disabled:opacity-30"
                                            >
                                                <ArrowDown size={10} />
                                            </button>
                                        </div>
                                        <span className="text-base">{countryFlags[stat.country_code]}</span>
                                        <span className="flex-1 text-xs font-medium truncate">{stat.country_name}</span>
                                        <input
                                            type="number"
                                            value={stat.rescue_count}
                                            onChange={(e) => updateCountryStat('in_progress', idx, 'rescue_count', e.target.value)}
                                            className="w-12 px-1 py-0.5 border rounded text-xs text-center"
                                            placeholder="0"
                                        />
                                        <button
                                            onClick={() => removeCountryStat('in_progress', idx)}
                                            className="p-0.5 text-red-500 hover:bg-red-100 rounded"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {statsFormData.in_progress.length === 0 && (
                                    <p className="text-xs text-toss-gray-400 text-center py-3 bg-toss-gray-50 rounded-lg">국가를 검색하여 추가</p>
                                )}
                            </div>
                        </div>

                        {/* 구조 난항 (우측) */}
                        <div>
                            <h4 className="font-semibold text-orange-700 mb-3">구조 난항</h4>

                            {/* 국가 검색 입력 */}
                            <div className="relative mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-400" />
                                        <input
                                            type="text"
                                            value={countrySearchText.completed}
                                            onChange={(e) => setCountrySearchText(prev => ({ ...prev, completed: e.target.value }))}
                                            onKeyDown={(e) => handleCountrySearchKeyDown(e, 'completed')}
                                            onFocus={() => setShowCountryDropdown(prev => ({ ...prev, completed: true }))}
                                            onBlur={() => setTimeout(() => setShowCountryDropdown(prev => ({ ...prev, completed: false })), 200)}
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-300"
                                            placeholder="국가 검색"
                                        />
                                    </div>
                                </div>
                                {/* 검색 결과 드롭다운 */}
                                {showCountryDropdown.completed && countrySearchText.completed && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                        {getFilteredCountries(countrySearchText.completed).slice(0, 8).map(c => (
                                            <button
                                                key={c.code}
                                                onClick={() => addCountryStatWithSearch('completed', c)}
                                                className="w-full px-3 py-2 text-left hover:bg-orange-50 flex items-center gap-2 text-sm"
                                            >
                                                <span>{countryFlags[c.code]}</span>
                                                <span>{c.name}</span>
                                            </button>
                                        ))}
                                        {getFilteredCountries(countrySearchText.completed).length === 0 && (
                                            <div className="px-3 py-2 text-sm text-toss-gray-400">검색 결과 없음</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 추가된 국가 목록 */}
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {statsFormData.completed.map((stat, idx) => (
                                    <div key={idx} className="flex items-center gap-1 bg-orange-50 rounded-lg px-2 py-1.5">
                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                onClick={() => moveCountryStat('completed', idx, 'up')}
                                                disabled={idx === 0}
                                                className="p-0.5 text-toss-gray-400 hover:text-toss-gray-700 disabled:opacity-30"
                                            >
                                                <ArrowUp size={10} />
                                            </button>
                                            <button
                                                onClick={() => moveCountryStat('completed', idx, 'down')}
                                                disabled={idx === statsFormData.completed.length - 1}
                                                className="p-0.5 text-toss-gray-400 hover:text-toss-gray-700 disabled:opacity-30"
                                            >
                                                <ArrowDown size={10} />
                                            </button>
                                        </div>
                                        <span className="text-base">{countryFlags[stat.country_code]}</span>
                                        <span className="flex-1 text-xs font-medium truncate">{stat.country_name}</span>
                                        <input
                                            type="number"
                                            value={stat.rescue_count}
                                            onChange={(e) => updateCountryStat('completed', idx, 'rescue_count', e.target.value)}
                                            className="w-12 px-1 py-0.5 border rounded text-xs text-center"
                                            placeholder="0"
                                        />
                                        <button
                                            onClick={() => removeCountryStat('completed', idx)}
                                            className="p-0.5 text-red-500 hover:bg-red-100 rounded"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {statsFormData.completed.length === 0 && (
                                    <p className="text-xs text-toss-gray-400 text-center py-3 bg-toss-gray-50 rounded-lg">국가를 검색하여 추가</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
                        <Button
                            variant="secondary"
                            onClick={() => setIsStatsModalOpen(false)}
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleSaveStats}
                            className="flex-1"
                            disabled={uploading}
                        >
                            {uploading ? '저장 중...' : '저장'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* 참고 이미지 관리 모달 */}
            <Modal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                title="참고 이미지 관리"
            >
                <div className="space-y-4">
                    {referenceImage ? (
                        <div>
                            <p className="text-sm text-toss-gray-500 mb-2">현재 이미지</p>
                            <img
                                src={referenceImage.image_url}
                                alt="참고 이미지"
                                className="w-full max-h-64 object-contain rounded-xl border bg-toss-gray-50"
                            />
                        </div>
                    ) : (
                        <div className="text-center text-toss-gray-500 py-8 bg-toss-gray-50 rounded-xl">
                            등록된 이미지가 없습니다.
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            새 이미지 업로드
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleRefImageUpload}
                            ref={refImageInputRef}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-toss-blue"
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setIsImageModalOpen(false)}
                            className="flex-1"
                        >
                            닫기
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* 구조현황판 대시보드 */}
            <RescueDashboard
                isOpen={isDashboardOpen}
                onClose={() => setIsDashboardOpen(false)}
                summaryStats={summaryStats}
                countryStats={countryStats}
            />
        </div>
    )
}

export default RescuePage
// force rebuild Wed Jan 14 12:49:00 KST 2026

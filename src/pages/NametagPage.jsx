import { useState, useRef } from 'react'
import { Card, Button } from '../components/common'
import { Plus, Trash2, RotateCcw, Printer, Settings, Copy, Tag, ChevronDown, ChevronUp } from 'lucide-react'

const maskName = (s) => {
  if (!s) return ''
  if (s.length === 3) return s[0] + 'O' + s[2]
  if (s.length === 2) return s[0] + 'O'
  if (s.length >= 4) return s[0] + 'O'.repeat(s.length - 2) + s[s.length - 1]
  return s
}

const fmtDate = (s) => {
  if (!s) return ''
  const d = new Date(s)
  return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0')
}

export default function NametagPage() {
  const [rooms, setRooms] = useState([{
    id: 1, roomNum: '', persons: [
      { date: '', gender: '', name: '' },
      { date: '', gender: '', name: '' }
    ]
  }])
  const [nextId, setNextId] = useState(2)
  const [showSettings, setShowSettings] = useState(false)
  const [pos, setPos] = useState({ col1: 16.5, col2: 53.6, col3: 63.6, row1: 23.4, row2: 55.5 })
  const [fonts, setFonts] = useState({ data: 23, name: 31, room: 22 })

  const addRoom = () => {
    setRooms(prev => [...prev, {
      id: nextId,
      roomNum: '',
      persons: [
        { date: '', gender: '', name: '' },
        { date: '', gender: '', name: '' }
      ]
    }])
    setNextId(prev => prev + 1)
  }

  const removeRoom = (id) => {
    setRooms(prev => prev.filter(r => r.id !== id))
  }

  const updateRoom = (id, field, value, pi) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== id) return r
      if (pi !== undefined) {
        const persons = [...r.persons]
        persons[pi] = { ...persons[pi], [field]: value }
        return { ...r, persons }
      }
      return { ...r, [field]: value }
    }))
  }

  const resetAll = () => {
    setRooms([{
      id: 1, roomNum: '', persons: [
        { date: '', gender: '', name: '' },
        { date: '', gender: '', name: '' }
      ]
    }])
    setNextId(2)
  }

  const updatePos = (key, val) => setPos(prev => ({ ...prev, [key]: parseFloat(val) }))
  const updateFont = (key, val) => setFonts(prev => ({ ...prev, [key]: parseInt(val) }))

  const copyCSS = () => {
    const txt = `col1:${pos.col1} col2:${pos.col2} col3:${pos.col3} row1:${pos.row1} row2:${pos.row2} data:${fonts.data}px name:${fonts.name}px room:${fonts.room}px`
    navigator.clipboard.writeText(txt).then(() => alert('복사됨: ' + txt))
  }

  // 동적 스타일 계산
  const w1 = pos.col2 - pos.col1
  const w2 = pos.col3 - pos.col2
  const w3 = 100 - pos.col3
  const h1 = pos.row2 - pos.row1
  const h2 = 96 - pos.row2

  const nametagStyles = {
    roomNum: { left: 0, top: '23.4%', width: `${pos.col1}%`, height: '72.6%', fontSize: `${fonts.room}px`, fontWeight: 900, color: '#000' },
    r1Date: { left: `${pos.col1}%`, top: `${pos.row1}%`, width: `${w1}%`, height: `${h1}%`, fontSize: `${fonts.data}px`, fontWeight: 500 },
    r1Gender: { left: `${pos.col2}%`, top: `${pos.row1}%`, width: `${w2}%`, height: `${h1}%`, fontSize: `${fonts.data}px`, fontWeight: 500 },
    r1Name: { left: `${pos.col3}%`, top: `${pos.row1}%`, width: `${w3}%`, height: `${h1}%`, fontSize: `${fonts.name}px`, fontWeight: 800 },
    r2Date: { left: `${pos.col1}%`, top: `${pos.row2}%`, width: `${w1}%`, height: `${h2}%`, fontSize: `${fonts.data}px`, fontWeight: 500 },
    r2Gender: { left: `${pos.col2}%`, top: `${pos.row2}%`, width: `${w2}%`, height: `${h2}%`, fontSize: `${fonts.data}px`, fontWeight: 500 },
    r2Name: { left: `${pos.col3}%`, top: `${pos.row2}%`, width: `${w3}%`, height: `${h2}%`, fontSize: `${fonts.name}px`, fontWeight: 800 },
  }

  const txtBase = {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Noto Sans KR', sans-serif",
    color: '#1d1d1f',
  }

  return (
    <>
      {/* 인쇄 전용 스타일 */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&display=swap');
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .print-hide { display: none !important; }
          .nametag-print-area {
            display: flex !important; flex-wrap: wrap !important; flex-direction: row !important;
            gap: 4mm !important; justify-content: center !important; align-items: flex-start !important;
            padding: 5mm !important;
          }
          .nametag-tag-wrap {
            background: transparent !important; padding: 0 !important; margin: 0 !important;
            box-shadow: none !important; border: none !important;
            page-break-inside: avoid; break-inside: avoid;
            display: inline-block; width: auto; height: auto;
          }
          .nametag-box, .nametag-box * {
            box-shadow: none !important; outline: none !important;
            text-shadow: none !important; filter: none !important;
          }
          aside, header, nav, [class*="shadow-toss"] { display: none !important; }
          main, [class*="flex-1"], [class*="ml-64"] {
            margin: 0 !important; padding: 0 !important; width: 100% !important;
          }
          @page { margin: 5mm; size: auto; }
        }
      `}</style>

      <div className="space-y-6">
        {/* 헤더 배너 */}
        <Card padding="p-0" className="print-hide overflow-hidden">
          <div className="bg-gradient-to-r from-toss-blue to-blue-600 p-6 md:p-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-toss flex items-center justify-center">
                <Tag size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">네임택 출력</h1>
                <p className="text-blue-100 text-sm mt-1">아크릴 네임택을 간편하게 만들고 인쇄하세요</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 좌측: 입력 패널 */}
          <div className="w-full lg:w-[400px] lg:min-w-[400px] space-y-4 print-hide">
            {/* 사이즈 & 액션 */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold text-toss-gray-500 uppercase tracking-wider">사이즈</span>
                  <p className="text-sm font-medium text-toss-gray-900 mt-1">고정: <strong>130 x 45 mm</strong></p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="primary" onClick={addRoom}>
                  <Plus size={16} /> 추가
                </Button>
                <Button size="sm" variant="secondary" onClick={resetAll}>
                  <RotateCcw size={16} /> 초기화
                </Button>
                <Button size="sm" variant="primary" onClick={() => window.print()} className="ml-auto">
                  <Printer size={16} /> 인쇄하기
                </Button>
              </div>
            </Card>

            {/* 위치 조정 */}
            <Card padding="p-0">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-between p-4 text-sm font-semibold text-toss-gray-700 hover:bg-toss-gray-50 transition-all rounded-toss-lg"
              >
                <div className="flex items-center gap-2">
                  <Settings size={16} className="text-toss-gray-500" />
                  위치 조정 (실시간)
                </div>
                {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showSettings && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="text-[11px] font-semibold text-toss-gray-500 uppercase tracking-wider">세로선 위치</div>
                  {[
                    { label: '로고|입소일', key: 'col1', min: 5, max: 25 },
                    { label: '입소일|성별', key: 'col2', min: 30, max: 65 },
                    { label: '성별|이름', key: 'col3', min: 40, max: 75 },
                  ].map(s => (
                    <div key={s.key} className="flex items-center gap-2">
                      <span className="text-xs text-toss-gray-500 min-w-[80px]">{s.label}</span>
                      <input type="range" min={s.min} max={s.max} step="0.1" value={pos[s.key]}
                        onChange={e => updatePos(s.key, e.target.value)}
                        className="flex-1 h-1 accent-toss-blue" />
                      <span className="text-xs text-toss-gray-400 min-w-[40px] text-right tabular-nums">{pos[s.key]}%</span>
                    </div>
                  ))}

                  <div className="text-[11px] font-semibold text-toss-gray-500 uppercase tracking-wider pt-2">가로선 위치</div>
                  {[
                    { label: '헤더|1행', key: 'row1', min: 15, max: 35 },
                    { label: '1행|2행', key: 'row2', min: 45, max: 70 },
                  ].map(s => (
                    <div key={s.key} className="flex items-center gap-2">
                      <span className="text-xs text-toss-gray-500 min-w-[80px]">{s.label}</span>
                      <input type="range" min={s.min} max={s.max} step="0.1" value={pos[s.key]}
                        onChange={e => updatePos(s.key, e.target.value)}
                        className="flex-1 h-1 accent-toss-blue" />
                      <span className="text-xs text-toss-gray-400 min-w-[40px] text-right tabular-nums">{pos[s.key]}%</span>
                    </div>
                  ))}

                  <div className="text-[11px] font-semibold text-toss-gray-500 uppercase tracking-wider pt-2">글씨 크기</div>
                  {[
                    { label: '입소일/성별', key: 'data', min: 10, max: 30 },
                    { label: '이름', key: 'name', min: 16, max: 40 },
                    { label: '호실', key: 'room', min: 14, max: 36 },
                  ].map(s => (
                    <div key={s.key} className="flex items-center gap-2">
                      <span className="text-xs text-toss-gray-500 min-w-[80px]">{s.label}</span>
                      <input type="range" min={s.min} max={s.max} step="1" value={fonts[s.key]}
                        onChange={e => updateFont(s.key, e.target.value)}
                        className="flex-1 h-1 accent-toss-blue" />
                      <span className="text-xs text-toss-gray-400 min-w-[40px] text-right tabular-nums">{fonts[s.key]}px</span>
                    </div>
                  ))}

                  <button onClick={copyCSS}
                    className="mt-2 flex items-center gap-1 text-xs text-toss-gray-600 hover:text-toss-blue transition-colors">
                    <Copy size={12} /> CSS 값 복사
                  </button>
                </div>
              )}
            </Card>

            {/* 호실 목록 */}
            <Card>
              <div className="text-xs font-semibold text-toss-gray-500 uppercase tracking-wider mb-3">
                호실 정보 ({rooms.length}개)
              </div>
              <div className="space-y-3">
                {rooms.map((r, idx) => (
                  <div key={r.id} className="bg-toss-gray-50 rounded-toss p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-toss-gray-900">네임택 {idx + 1}</span>
                        {r.roomNum && (
                          <span className="text-[11px] font-semibold text-toss-blue bg-toss-blue/10 px-2 py-0.5 rounded-full">
                            {r.roomNum}호
                          </span>
                        )}
                      </div>
                      <button onClick={() => removeRoom(r.id)}
                        className="text-toss-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* 호실번호 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-toss-gray-500 min-w-[56px]">호실번호</span>
                      <input type="text" placeholder="102" value={r.roomNum}
                        onChange={e => updateRoom(r.id, 'roomNum', e.target.value)}
                        className="w-20 px-3 py-2 bg-white border border-toss-gray-200 rounded-toss text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue transition-all" />
                    </div>

                    <div className="h-px bg-toss-gray-200 my-3" />

                    {/* 1번 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-toss-gray-500 min-w-[56px]">1번</span>
                      <div className="flex gap-1.5 flex-1 flex-wrap">
                        <input type="date" value={r.persons[0].date}
                          onChange={e => updateRoom(r.id, 'date', e.target.value, 0)}
                          className="px-2.5 py-2 bg-white border border-toss-gray-200 rounded-toss text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue transition-all" />
                        <select value={r.persons[0].gender}
                          onChange={e => updateRoom(r.id, 'gender', e.target.value, 0)}
                          className="min-w-[60px] px-2 py-2 bg-white border border-toss-gray-200 rounded-toss text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue transition-all">
                          <option value="">성별</option>
                          <option value="남">남</option>
                          <option value="여">여</option>
                        </select>
                        <input type="text" placeholder="이름" value={r.persons[0].name}
                          onChange={e => updateRoom(r.id, 'name', e.target.value, 0)}
                          className="flex-1 min-w-[70px] px-3 py-2 bg-white border border-toss-gray-200 rounded-toss text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue transition-all" />
                      </div>
                    </div>

                    {/* 2번 */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-toss-gray-500 min-w-[56px]">2번</span>
                      <div className="flex gap-1.5 flex-1 flex-wrap">
                        <input type="date" value={r.persons[1].date}
                          onChange={e => updateRoom(r.id, 'date', e.target.value, 1)}
                          className="px-2.5 py-2 bg-white border border-toss-gray-200 rounded-toss text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue transition-all" />
                        <select value={r.persons[1].gender}
                          onChange={e => updateRoom(r.id, 'gender', e.target.value, 1)}
                          className="min-w-[60px] px-2 py-2 bg-white border border-toss-gray-200 rounded-toss text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue transition-all">
                          <option value="">성별</option>
                          <option value="남">남</option>
                          <option value="여">여</option>
                        </select>
                        <input type="text" placeholder="이름" value={r.persons[1].name}
                          onChange={e => updateRoom(r.id, 'name', e.target.value, 1)}
                          className="flex-1 min-w-[70px] px-3 py-2 bg-white border border-toss-gray-200 rounded-toss text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* 우측: 미리보기 */}
          <div className="flex-1">
            <Card className="print-hide mb-4">
              <span className="text-xs font-semibold text-toss-gray-500 uppercase tracking-wider">미리보기</span>
            </Card>
            <div className="nametag-print-area flex flex-col gap-6 items-center">
              {rooms.length === 0 ? (
                <Card className="w-full text-center py-16">
                  <p className="text-toss-gray-400 text-sm">네임택을 추가하세요</p>
                </Card>
              ) : (
                rooms.map(r => (
                  <div key={r.id} className="nametag-tag-wrap">
                    <div className="nametag-box"
                      style={{
                        width: '130mm', height: '45mm', position: 'relative',
                        backgroundImage: `url('${import.meta.env.BASE_URL}name.jpg')`,
                        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
                        overflow: 'hidden',
                      }}>
                      <div style={{ ...txtBase, ...nametagStyles.roomNum }}>{r.roomNum ? r.roomNum + '호' : ''}</div>
                      <div style={{ ...txtBase, ...nametagStyles.r1Date }}>{fmtDate(r.persons[0].date)}</div>
                      <div style={{ ...txtBase, ...nametagStyles.r1Gender }}>{r.persons[0].gender}</div>
                      <div style={{ ...txtBase, ...nametagStyles.r1Name }}>{maskName(r.persons[0].name)}</div>
                      <div style={{ ...txtBase, ...nametagStyles.r2Date }}>{fmtDate(r.persons[1].date)}</div>
                      <div style={{ ...txtBase, ...nametagStyles.r2Gender }}>{r.persons[1].gender}</div>
                      <div style={{ ...txtBase, ...nametagStyles.r2Name }}>{maskName(r.persons[1].name)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

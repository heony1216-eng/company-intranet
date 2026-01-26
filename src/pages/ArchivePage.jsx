import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Button, Modal } from '../components/common'
import { FolderOpen, FileSpreadsheet, Search, Download, File, Folder, ChevronRight, RefreshCw, ArrowLeft, Trash2, Plus, Tag, X, Settings } from 'lucide-react'
import { listDropboxFiles, getDropboxDownloadLink, uploadToDropboxWithOriginalName, deleteFromDropbox, createDropboxFolder } from '../lib/dropbox'

// 문서 번호 추출 정규식 (예: JD-001, QF-0001, etc.)
const DOCUMENT_NUMBER_REGEX = /([A-Z]{2,4}[-_]?\d{3,5})/gi

// 로컬 스토리지 키
const LABELS_STORAGE_KEY = 'archive_labels'

// 기본 라벨 목록
const DEFAULT_LABELS = {
    forms: ['공문', '양식', '보고서', '계약서'],
    rescue: ['공문', '보고서', '내부문서', '회의자료']
}

const ArchivePage = () => {
    const { type } = useParams() // 'forms' or 'rescue'

    const [files, setFiles] = useState([])
    const [filteredFiles, setFilteredFiles] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPath, setCurrentPath] = useState('')
    const [pathHistory, setPathHistory] = useState([])
    const [documentIndex, setDocumentIndex] = useState([])
    const fileInputRef = useRef(null)

    // 라벨 관련 상태
    const [labels, setLabels] = useState([])
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false)
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [newLabelName, setNewLabelName] = useState('')
    const [selectedLabel, setSelectedLabel] = useState('')
    const [pendingFiles, setPendingFiles] = useState([])

    // 라벨 로드 (로컬스토리지에서)
    useEffect(() => {
        const storedLabels = localStorage.getItem(LABELS_STORAGE_KEY)
        if (storedLabels) {
            const parsed = JSON.parse(storedLabels)
            setLabels(parsed[type] || DEFAULT_LABELS[type] || [])
        } else {
            setLabels(DEFAULT_LABELS[type] || [])
        }
    }, [type])

    // 라벨 저장
    const saveLabels = (newLabels) => {
        const storedLabels = localStorage.getItem(LABELS_STORAGE_KEY)
        const parsed = storedLabels ? JSON.parse(storedLabels) : {}
        parsed[type] = newLabels
        localStorage.setItem(LABELS_STORAGE_KEY, JSON.stringify(parsed))
        setLabels(newLabels)
    }

    // 라벨 추가
    const handleAddLabel = async () => {
        if (!newLabelName.trim()) return
        if (labels.includes(newLabelName.trim())) {
            alert('이미 존재하는 라벨입니다.')
            return
        }

        const labelName = newLabelName.trim()
        const newLabels = [...labels, labelName]
        saveLabels(newLabels)

        // Dropbox에 폴더 생성
        try {
            const basePath = getBasePath()
            await createDropboxFolder(`${basePath}/${labelName}`)
        } catch (error) {
            console.error('폴더 생성 실패:', error)
        }

        setNewLabelName('')
        fetchFiles(currentPath) // 폴더 목록 새로고침
    }

    // 라벨 삭제
    const handleDeleteLabel = (labelToDelete) => {
        if (!confirm(`"${labelToDelete}" 라벨을 삭제하시겠습니까?\n(Dropbox의 폴더는 삭제되지 않습니다)`)) return
        const newLabels = labels.filter(l => l !== labelToDelete)
        saveLabels(newLabels)
    }

    // 드롭박스 기본 폴더 경로 설정
    const getBasePath = () => {
        if (type === 'forms') {
            return '/자료실/양식'
        } else if (type === 'rescue') {
            return '/자료실/문서'
        }
        return '/자료실'
    }

    const getPageTitle = () => {
        if (type === 'forms') return '양식'
        if (type === 'rescue') return '문서'
        return '자료실'
    }

    useEffect(() => {
        const basePath = getBasePath()
        setCurrentPath(basePath)
        setPathHistory([basePath])
        fetchFiles(basePath)
    }, [type])

    useEffect(() => {
        filterFiles()
    }, [searchQuery, files])

    const fetchFiles = async (path) => {
        setLoading(true)
        try {
            const fileList = await listDropboxFiles(path)
            const sorted = fileList.sort((a, b) => {
                if (a.isFolder && !b.isFolder) return -1
                if (!a.isFolder && b.isFolder) return 1
                return a.name.localeCompare(b.name, 'ko')
            })
            setFiles(sorted)
            buildDocumentIndex(sorted)
        } catch (error) {
            console.error('파일 목록 로딩 실패:', error)
            setFiles([])
        } finally {
            setLoading(false)
        }
    }

    const buildDocumentIndex = (fileList) => {
        const index = []
        fileList.forEach(file => {
            if (!file.isFolder) {
                const matches = file.name.match(DOCUMENT_NUMBER_REGEX)
                if (matches) {
                    matches.forEach(docNum => {
                        index.push({
                            documentNumber: docNum.toUpperCase(),
                            fileName: file.name,
                            path: file.path,
                        })
                    })
                }
            }
        })
        setDocumentIndex(index)
    }

    const filterFiles = () => {
        if (!searchQuery.trim()) {
            setFilteredFiles(files)
            return
        }

        const query = searchQuery.toLowerCase().trim()
        const docMatches = documentIndex.filter(item =>
            item.documentNumber.toLowerCase().includes(query)
        )

        if (docMatches.length > 0) {
            const matchedPaths = new Set(docMatches.map(m => m.path))
            const filtered = files.filter(f => matchedPaths.has(f.path))
            setFilteredFiles(filtered)
        } else {
            const filtered = files.filter(file =>
                file.name.toLowerCase().includes(query)
            )
            setFilteredFiles(filtered)
        }
    }

    const handleFolderClick = (folder) => {
        const newPath = folder.path
        setPathHistory(prev => [...prev, newPath])
        setCurrentPath(newPath)
        fetchFiles(newPath)
        setSearchQuery('')
    }

    const handleBack = () => {
        if (pathHistory.length > 1) {
            const newHistory = [...pathHistory]
            newHistory.pop()
            const prevPath = newHistory[newHistory.length - 1]
            setPathHistory(newHistory)
            setCurrentPath(prevPath)
            fetchFiles(prevPath)
            setSearchQuery('')
        }
    }

    const handleFileDownload = async (file) => {
        try {
            const link = await getDropboxDownloadLink(file.path)
            window.open(link, '_blank')
        } catch (error) {
            console.error('다운로드 실패:', error)
            alert('파일 다운로드에 실패했습니다.')
        }
    }

    // 파일 선택 시 모달 열기
    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files)
        if (selectedFiles.length === 0) return

        setPendingFiles(selectedFiles)
        setSelectedLabel('') // 라벨 선택 초기화
        setIsUploadModalOpen(true)

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // 라벨 선택 후 실제 업로드
    const handleFileUpload = async () => {
        if (pendingFiles.length === 0) return

        // 업로드 경로 결정 (라벨 선택 시 해당 폴더, 아니면 현재 경로)
        const uploadPath = selectedLabel
            ? `${getBasePath()}/${selectedLabel}`
            : currentPath

        setUploading(true)
        setIsUploadModalOpen(false)

        try {
            // 라벨 폴더가 선택된 경우 폴더 생성 확인
            if (selectedLabel) {
                await createDropboxFolder(uploadPath)
            }

            for (const file of pendingFiles) {
                await uploadToDropboxWithOriginalName(file, uploadPath)
            }
            alert(`${pendingFiles.length}개 파일이 업로드되었습니다.`)

            // 업로드한 폴더로 이동
            if (selectedLabel && currentPath !== uploadPath) {
                setCurrentPath(uploadPath)
                setPathHistory(prev => [...prev, uploadPath])
            }
            fetchFiles(uploadPath)
        } catch (error) {
            console.error('업로드 실패:', error)
            alert('파일 업로드에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
            setPendingFiles([])
        }
    }

    const handleFileDelete = async (file) => {
        if (!confirm(`"${file.name}"을(를) 삭제하시겠습니까?`)) return

        try {
            await deleteFromDropbox(file.path)
            alert('삭제되었습니다.')
            fetchFiles(currentPath)
        } catch (error) {
            console.error('삭제 실패:', error)
            alert('파일 삭제에 실패했습니다.')
        }
    }

    const handleRefresh = () => {
        fetchFiles(currentPath)
    }

    const getFileIcon = (file) => {
        if (file.isFolder) {
            return <Folder size={20} className="text-yellow-500" />
        }
        const ext = file.name.split('.').pop().toLowerCase()
        if (['xlsx', 'xls', 'csv'].includes(ext)) {
            return <FileSpreadsheet size={20} className="text-green-600" />
        }
        return <File size={20} className="text-toss-gray-500" />
    }

    const formatFileSize = (bytes) => {
        if (!bytes) return '-'
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const getCurrentFolderName = () => {
        if (currentPath === getBasePath()) return getPageTitle()
        return currentPath.split('/').pop() || getPageTitle()
    }

    const getBreadcrumbs = () => {
        const basePath = getBasePath()
        if (currentPath === basePath) return []

        const relativePath = currentPath.replace(basePath, '')
        const parts = relativePath.split('/').filter(Boolean)

        return parts.map((part, index) => {
            const path = basePath + '/' + parts.slice(0, index + 1).join('/')
            return { name: part, path }
        })
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <FolderOpen size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-1">{getPageTitle()}</h2>
                        <p className="text-white/90">
                            문서를 업로드하고 관리할 수 있습니다
                        </p>
                    </div>
                </div>
            </Card>

            {/* Search & Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    {pathHistory.length > 1 && (
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-toss-gray-100 rounded-lg transition-colors"
                            title="이전 폴더"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-toss-gray-900">
                        {getCurrentFolderName()}
                    </h1>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:w-64">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="검색..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-toss-gray-300 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Upload Button */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="whitespace-nowrap"
                    >
                        {uploading ? (
                            <RefreshCw size={18} className="animate-spin" />
                        ) : (
                            <Plus size={18} />
                        )}
                        {uploading ? '업로드 중...' : '파일 추가'}
                    </Button>

                    <button
                        onClick={() => setIsLabelModalOpen(true)}
                        className="p-2 hover:bg-toss-gray-100 rounded-lg transition-colors"
                        title="라벨 관리"
                    >
                        <Settings size={20} />
                    </button>

                    <button
                        onClick={handleRefresh}
                        className="p-2 hover:bg-toss-gray-100 rounded-lg transition-colors"
                        title="새로고침"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Breadcrumbs */}
            {getBreadcrumbs().length > 0 && (
                <div className="flex items-center gap-1 text-sm text-toss-gray-600 overflow-x-auto">
                    <button
                        onClick={() => {
                            const basePath = getBasePath()
                            setCurrentPath(basePath)
                            setPathHistory([basePath])
                            fetchFiles(basePath)
                        }}
                        className="hover:text-toss-blue transition-colors whitespace-nowrap"
                    >
                        {getPageTitle()}
                    </button>
                    {getBreadcrumbs().map((crumb) => (
                        <div key={crumb.path} className="flex items-center gap-1">
                            <ChevronRight size={14} className="text-toss-gray-400" />
                            <button
                                onClick={() => {
                                    setCurrentPath(crumb.path)
                                    setPathHistory(prev => prev.slice(0, prev.indexOf(crumb.path) + 1) || [crumb.path])
                                    fetchFiles(crumb.path)
                                }}
                                className="hover:text-toss-blue transition-colors whitespace-nowrap"
                            >
                                {crumb.name}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* File List */}
            <Card padding="p-0">
                {loading ? (
                    <div className="text-center text-toss-gray-500 py-12">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                        로딩 중...
                    </div>
                ) : filteredFiles.length > 0 ? (
                    <div className="divide-y divide-toss-gray-100">
                        {filteredFiles.map((file) => (
                            <div
                                key={file.id || file.path}
                                className={`flex items-center justify-between p-4 hover:bg-toss-gray-50 transition-colors ${
                                    file.isFolder ? 'cursor-pointer' : ''
                                }`}
                                onClick={() => file.isFolder && handleFolderClick(file)}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {getFileIcon(file)}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-toss-gray-900 truncate">
                                            {file.name}
                                        </p>
                                        {!file.isFolder && (
                                            <p className="text-xs text-toss-gray-500">
                                                {formatFileSize(file.size)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {file.isFolder ? (
                                    <ChevronRight size={20} className="text-toss-gray-400" />
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleFileDownload(file)
                                            }}
                                            className="p-2 text-toss-blue hover:bg-toss-blue/10 rounded-lg transition-colors"
                                            title="다운로드"
                                        >
                                            <Download size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleFileDelete(file)
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="삭제"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-toss-gray-500 py-12">
                        {searchQuery ? '검색 결과가 없습니다' : '이 폴더에 파일이 없습니다'}
                    </div>
                )}
            </Card>

            {/* Document Index Info */}
            {documentIndex.length > 0 && !searchQuery && (
                <p className="text-sm text-toss-gray-500 text-center">
                    {documentIndex.length}개의 문서번호가 인덱싱되었습니다
                </p>
            )}

            {/* 라벨 관리 모달 */}
            <Modal
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                title="라벨 관리"
            >
                <div className="space-y-4">
                    <p className="text-sm text-toss-gray-600">
                        라벨을 추가하면 Dropbox에 해당 이름의 폴더가 자동으로 생성됩니다.
                    </p>

                    {/* 새 라벨 추가 */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            placeholder="새 라벨 이름"
                            className="flex-1 px-4 py-2 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                        />
                        <Button onClick={handleAddLabel}>
                            <Plus size={18} />
                            추가
                        </Button>
                    </div>

                    {/* 라벨 목록 */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-toss-gray-700">현재 라벨</h4>
                        {labels.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {labels.map((label) => (
                                    <div
                                        key={label}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-toss-gray-100 rounded-full"
                                    >
                                        <Tag size={14} className="text-toss-gray-500" />
                                        <span className="text-sm text-toss-gray-700">{label}</span>
                                        <button
                                            onClick={() => handleDeleteLabel(label)}
                                            className="p-0.5 hover:bg-toss-gray-200 rounded-full transition-colors"
                                        >
                                            <X size={14} className="text-toss-gray-500" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-toss-gray-500">등록된 라벨이 없습니다.</p>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button variant="secondary" onClick={() => setIsLabelModalOpen(false)}>
                            닫기
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* 파일 업로드 모달 (라벨 선택) */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    setIsUploadModalOpen(false)
                    setPendingFiles([])
                }}
                title="파일 업로드"
            >
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-toss-gray-600 mb-2">
                            선택된 파일: <span className="font-medium">{pendingFiles.length}개</span>
                        </p>
                        <div className="max-h-32 overflow-y-auto bg-toss-gray-50 rounded-xl p-3">
                            {pendingFiles.map((file, idx) => (
                                <p key={idx} className="text-sm text-toss-gray-700 truncate">
                                    {file.name}
                                </p>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            라벨 선택 (선택사항)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedLabel('')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    selectedLabel === ''
                                        ? 'bg-toss-blue text-white'
                                        : 'bg-toss-gray-100 text-toss-gray-700 hover:bg-toss-gray-200'
                                }`}
                            >
                                현재 폴더에 저장
                            </button>
                            {labels.map((label) => (
                                <button
                                    key={label}
                                    onClick={() => setSelectedLabel(label)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                        selectedLabel === label
                                            ? 'bg-toss-blue text-white'
                                            : 'bg-toss-gray-100 text-toss-gray-700 hover:bg-toss-gray-200'
                                    }`}
                                >
                                    <Tag size={14} />
                                    {label}
                                </button>
                            ))}
                        </div>
                        {selectedLabel && (
                            <p className="mt-2 text-xs text-toss-gray-500">
                                파일이 "{getBasePath()}/{selectedLabel}" 폴더에 저장됩니다.
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsUploadModalOpen(false)
                                setPendingFiles([])
                            }}
                        >
                            취소
                        </Button>
                        <Button onClick={handleFileUpload}>
                            업로드
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default ArchivePage

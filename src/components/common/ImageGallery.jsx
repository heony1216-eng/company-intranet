import { useState, useRef, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

/**
 * 이미지 갤러리 컴포넌트 - 클릭 시 확대 모달 + 드래그/스와이프 지원
 */
const ImageGallery = ({ images = [], className = '' }) => {
    const [selectedIndex, setSelectedIndex] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // 드래그/스와이프 관련 상태
    const [isDragging, setIsDragging] = useState(false)
    const [startX, setStartX] = useState(0)
    const [translateX, setTranslateX] = useState(0)
    const containerRef = useRef(null)

    const openImage = (index) => {
        setSelectedIndex(index)
        setIsModalOpen(true)
        setTranslateX(0)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setSelectedIndex(null)
        setTranslateX(0)
    }

    const goToPrevious = () => {
        setTranslateX(0)
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    }

    const goToNext = () => {
        setTranslateX(0)
        setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    }

    // 키보드 네비게이션
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isModalOpen) return
            if (e.key === 'ArrowLeft') goToPrevious()
            if (e.key === 'ArrowRight') goToNext()
            if (e.key === 'Escape') closeModal()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isModalOpen])

    // 마우스 드래그 시작
    const handleMouseDown = (e) => {
        if (images.length <= 1) return
        setIsDragging(true)
        setStartX(e.clientX)
    }

    // 터치 드래그 시작
    const handleTouchStart = (e) => {
        if (images.length <= 1) return
        setIsDragging(true)
        setStartX(e.touches[0].clientX)
    }

    // 마우스/터치 드래그 중
    const handleMove = (clientX) => {
        if (!isDragging) return
        const diff = clientX - startX
        setTranslateX(diff)
    }

    const handleMouseMove = (e) => {
        handleMove(e.clientX)
    }

    const handleTouchMove = (e) => {
        handleMove(e.touches[0].clientX)
    }

    // 드래그 종료
    const handleDragEnd = () => {
        if (!isDragging) return
        setIsDragging(false)

        const threshold = 100 // 스와이프 감지 임계값

        if (translateX > threshold) {
            goToPrevious()
        } else if (translateX < -threshold) {
            goToNext()
        } else {
            setTranslateX(0)
        }
    }

    if (!images || images.length === 0) return null

    return (
        <>
            {/* 썸네일 그리드 */}
            <div className={`grid gap-3 ${className}`}>
                {images.map((url, index) => (
                    <div
                        key={index}
                        onClick={() => openImage(index)}
                        className="relative group cursor-pointer overflow-hidden rounded-xl bg-toss-gray-100"
                    >
                        <img
                            src={url}
                            alt={`Image ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                            <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" size={32} />
                        </div>
                    </div>
                ))}
            </div>

            {/* 확대 모달 */}
            {isModalOpen && selectedIndex !== null && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none"
                    onClick={closeModal}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchEnd={handleDragEnd}
                >
                    {/* 닫기 버튼 */}
                    <button
                        onClick={closeModal}
                        className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X size={24} />
                    </button>

                    {/* 이전/다음 버튼 (이미지가 2개 이상일 때만) */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                                className="absolute left-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            >
                                <ChevronLeft size={28} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                                className="absolute right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            >
                                <ChevronRight size={28} />
                            </button>
                        </>
                    )}

                    {/* 이미지 카운터 */}
                    <div className="absolute top-4 left-4 z-10 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                        {selectedIndex + 1} / {images.length}
                    </div>

                    {/* 확대된 이미지 (드래그/스와이프 지원) */}
                    <div
                        ref={containerRef}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        className="max-w-[90vw] max-h-[90vh] relative cursor-grab active:cursor-grabbing"
                        style={{
                            transform: `translateX(${translateX}px)`,
                            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                        }}
                    >
                        <img
                            src={images[selectedIndex]}
                            alt={`Image ${selectedIndex + 1}`}
                            className="max-w-full max-h-[90vh] object-contain rounded-lg pointer-events-none"
                            draggable={false}
                        />
                    </div>

                    {/* 스와이프 힌트 (이미지 2개 이상일 때) */}
                    {images.length > 1 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                            {images.map((_, index) => (
                                <div
                                    key={index}
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        index === selectedIndex ? 'bg-white' : 'bg-white/30'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

export default ImageGallery

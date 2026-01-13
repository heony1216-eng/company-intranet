import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

/**
 * 이미지 갤러리 컴포넌트 - 클릭 시 확대 모달
 */
const ImageGallery = ({ images = [], className = '' }) => {
    const [selectedIndex, setSelectedIndex] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const openImage = (index) => {
        setSelectedIndex(index)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setSelectedIndex(null)
    }

    const goToPrevious = () => {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    }

    const goToNext = () => {
        setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
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
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                    onClick={closeModal}
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

                    {/* 확대된 이미지 */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-[90vw] max-h-[90vh] relative"
                    >
                        <img
                            src={images[selectedIndex]}
                            alt={`Image ${selectedIndex + 1}`}
                            className="max-w-full max-h-[90vh] object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}
        </>
    )
}

export default ImageGallery

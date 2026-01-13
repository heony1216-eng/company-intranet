import imageCompression from 'browser-image-compression'

/**
 * 이미지를 WebP 포맷으로 압축 및 변환 (최대 300KB)
 * @param {File} file - 압축할 이미지 파일
 * @param {Object} options - 압축 옵션
 * @returns {Promise<File>} 압축된 WebP 이미지 파일
 */
export const compressImageToWebP = async (file, options = {}) => {
    const defaultOptions = {
        maxSizeMB: 0.29, // 300KB 이하로 제한 (여유를 위해 290KB로 설정)
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp', // WebP 포맷으로 변환
        initialQuality: 0.85, // 초기 품질 설정
        ...options
    }

    try {
        const compressedFile = await imageCompression(file, defaultOptions)
        console.log(`이미지 압축 완료: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`)

        // 파일명을 .webp 확장자로 변경
        const newFileName = file.name.replace(/\.[^/.]+$/, '.webp')
        const webpFile = new File([compressedFile], newFileName, {
            type: 'image/webp',
            lastModified: Date.now()
        })

        return webpFile
    } catch (error) {
        console.error('이미지 압축 실패:', error)
        throw error
    }
}

/**
 * 여러 이미지를 한번에 WebP로 압축
 * @param {File[]} files - 압축할 이미지 파일 배열
 * @returns {Promise<File[]>} 압축된 WebP 이미지 파일 배열
 */
export const compressImagesToWebP = async (files) => {
    const compressedFiles = await Promise.all(
        Array.from(files).map(file => compressImageToWebP(file))
    )
    return compressedFiles
}

/**
 * 이미지 파일 유효성 검사
 * @param {File} file - 검사할 파일
 * @returns {boolean} 유효한 이미지 파일 여부
 */
export const isValidImageFile = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    const maxSize = 10 * 1024 * 1024 // 원본 파일 최대 10MB

    return validTypes.includes(file.type) && file.size <= maxSize
}

/**
 * 이미지 미리보기 URL 생성
 * @param {File} file - 이미지 파일
 * @returns {string} 미리보기 URL
 */
export const createImagePreviewUrl = (file) => {
    return URL.createObjectURL(file)
}

/**
 * 미리보기 URL 해제 (메모리 정리)
 * @param {string} url - 해제할 URL
 */
export const revokeImagePreviewUrl = (url) => {
    URL.revokeObjectURL(url)
}

import { Dropbox } from 'dropbox'

const DROPBOX_ACCESS_TOKEN = import.meta.env.VITE_DROPBOX_ACCESS_TOKEN

// Dropbox 클라이언트 생성
const dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN })

/**
 * 파일을 Dropbox에 업로드하고 공유 링크를 반환
 * @param {File} file - 업로드할 파일
 * @param {string} folder - 저장할 폴더 경로 (예: '/worklogs', '/meetings')
 * @returns {Promise<{url: string, name: string}>} - 공유 링크와 파일명
 */
export const uploadToDropbox = async (file, folder = '/intranet') => {
    try {
        // 파일명에 타임스탬프 추가 (중복 방지)
        const timestamp = Date.now()
        const fileName = `${timestamp}_${file.name}`
        const path = `${folder}/${fileName}`

        // ArrayBuffer로 변환
        const arrayBuffer = await file.arrayBuffer()

        // Dropbox에 업로드
        const uploadResult = await dbx.filesUpload({
            path: path,
            contents: arrayBuffer,
            mode: { '.tag': 'add' },
            autorename: true
        })

        // 공유 링크 생성
        let sharedLink
        try {
            const linkResult = await dbx.sharingCreateSharedLinkWithSettings({
                path: uploadResult.result.path_display,
                settings: {
                    requested_visibility: { '.tag': 'public' },
                    audience: { '.tag': 'public' },
                    access: { '.tag': 'viewer' }
                }
            })
            sharedLink = linkResult.result.url
        } catch (linkError) {
            // 이미 공유 링크가 있는 경우
            if (linkError.error?.error?.['.tag'] === 'shared_link_already_exists') {
                const existingLinks = await dbx.sharingListSharedLinks({
                    path: uploadResult.result.path_display
                })
                sharedLink = existingLinks.result.links[0]?.url
            } else {
                throw linkError
            }
        }

        // dl=0 을 dl=1로 변경하면 직접 다운로드 링크가 됨
        const directLink = sharedLink.replace('dl=0', 'dl=1')

        return {
            url: directLink,
            name: file.name,
            path: uploadResult.result.path_display,
            size: file.size
        }
    } catch (error) {
        console.error('Dropbox upload error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        if (error.error) {
            console.error('Error response:', error.error)
        }
        throw new Error('파일 업로드에 실패했습니다: ' + (error.error?.error_summary || error.message || '알 수 없는 오류'))
    }
}

/**
 * 여러 파일을 Dropbox에 업로드
 * @param {FileList|File[]} files - 업로드할 파일들
 * @param {string} folder - 저장할 폴더 경로
 * @returns {Promise<Array<{url: string, name: string}>>} - 업로드된 파일들의 정보
 */
export const uploadMultipleToDropbox = async (files, folder = '/intranet') => {
    const results = []

    for (const file of files) {
        const result = await uploadToDropbox(file, folder)
        results.push(result)
    }

    return results
}

/**
 * Dropbox에서 파일 삭제
 * @param {string} path - 삭제할 파일 경로
 */
export const deleteFromDropbox = async (path) => {
    try {
        await dbx.filesDeleteV2({ path })
        return true
    } catch (error) {
        console.error('Dropbox delete error:', error)
        return false
    }
}

export default dbx

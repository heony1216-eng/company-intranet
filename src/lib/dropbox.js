import { Dropbox } from 'dropbox'

// Dropbox OAuth 설정
const DROPBOX_APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY
const DROPBOX_APP_SECRET = import.meta.env.VITE_DROPBOX_APP_SECRET
const DROPBOX_REFRESH_TOKEN = import.meta.env.VITE_DROPBOX_REFRESH_TOKEN

// Access Token 캐시 (메모리에 저장)
let cachedAccessToken = null
let tokenExpiresAt = null

/**
 * Refresh Token을 사용하여 새 Access Token을 가져옴
 * @returns {Promise<string>} - Access Token
 */
const getAccessToken = async () => {
    // 캐시된 토큰이 있고 아직 유효한 경우 (만료 10분 전까지)
    if (cachedAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 600000) {
        return cachedAccessToken
    }

    // Refresh Token으로 새 Access Token 요청
    const response = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: DROPBOX_REFRESH_TOKEN,
            client_id: DROPBOX_APP_KEY,
            client_secret: DROPBOX_APP_SECRET,
        }),
    })

    if (!response.ok) {
        const errorData = await response.json()
        console.error('Token refresh error:', errorData)
        throw new Error('Access Token 갱신에 실패했습니다: ' + (errorData.error_description || errorData.error))
    }

    const data = await response.json()
    cachedAccessToken = data.access_token
    // expires_in은 초 단위, 밀리초로 변환
    tokenExpiresAt = Date.now() + (data.expires_in * 1000)

    return cachedAccessToken
}

/**
 * Dropbox 클라이언트 생성 (토큰 자동 갱신)
 * @returns {Promise<Dropbox>}
 */
const getDropboxClient = async () => {
    const accessToken = await getAccessToken()
    return new Dropbox({ accessToken })
}

/**
 * 파일을 Dropbox에 업로드하고 공유 링크를 반환
 * @param {File} file - 업로드할 파일
 * @param {string} folder - 저장할 폴더 경로 (예: '/worklogs', '/meetings')
 * @returns {Promise<{url: string, name: string}>} - 공유 링크와 파일명
 */
export const uploadToDropbox = async (file, folder = '/intranet') => {
    try {
        const dbx = await getDropboxClient()

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

        // Dropbox 직접 이미지 링크로 변환 (Safari 호환)
        // www.dropbox.com → dl.dropboxusercontent.com, dl=0 제거
        const directLink = sharedLink
            .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
            .replace('?dl=0', '')
            .replace('&dl=0', '')

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
 * Dropbox에서 파일 삭제 (경로로 삭제)
 * @param {string} path - 삭제할 파일 경로
 */
export const deleteFromDropbox = async (path) => {
    try {
        const dbx = await getDropboxClient()
        await dbx.filesDeleteV2({ path })
        return true
    } catch (error) {
        console.error('Dropbox delete error:', error)
        return false
    }
}

/**
 * 공유 링크 URL에서 파일 경로를 가져와 삭제
 * @param {string} url - Dropbox 공유 링크 URL
 */
export const deleteFileByUrl = async (url) => {
    try {
        if (!url) return false

        // dl.dropboxusercontent.com URL을 www.dropbox.com URL로 변환
        let sharedUrl = url
            .replace('dl.dropboxusercontent.com', 'www.dropbox.com')

        // URL에 dl=0 파라미터가 없으면 추가
        if (!sharedUrl.includes('dl=')) {
            sharedUrl += sharedUrl.includes('?') ? '&dl=0' : '?dl=0'
        }

        const dbx = await getDropboxClient()

        // 공유 링크에서 파일 메타데이터 가져오기
        const metadata = await dbx.sharingGetSharedLinkMetadata({
            url: sharedUrl
        })

        if (metadata.result?.path_lower) {
            // 파일 삭제
            await dbx.filesDeleteV2({ path: metadata.result.path_lower })
            return true
        }

        return false
    } catch (error) {
        console.error('Dropbox delete by URL error:', error)
        // 파일이 이미 삭제된 경우나 찾을 수 없는 경우는 성공으로 처리
        if (error.error?.error?.['.tag'] === 'path' ||
            error.error?.error_summary?.includes('not_found')) {
            return true
        }
        return false
    }
}

/**
 * 여러 파일을 URL로 삭제
 * @param {Array} fileUrls - 파일 URL 배열 (문자열 또는 {url, name} 객체)
 */
export const deleteMultipleFilesByUrl = async (fileUrls) => {
    if (!fileUrls || fileUrls.length === 0) return

    for (const item of fileUrls) {
        const url = typeof item === 'string' ? item : item?.url
        if (url) {
            await deleteFileByUrl(url)
        }
    }
}

// 기본 export는 getDropboxClient 함수로 변경
export default getDropboxClient

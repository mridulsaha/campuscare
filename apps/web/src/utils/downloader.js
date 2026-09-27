export function getCloudinaryDownloadUrl(fileUrl, customFileName = '') {
    if (!fileUrl) return '';

    const cleanName = customFileName
        ? customFileName.replace(/[^a-zA-Z0-9-]/g, '_')
        : '';

    const attachmentFlag = cleanName
        ? `fl_attachment:${cleanName}`
        : 'fl_attachment';

    if (fileUrl.includes('/upload/')) {
        return fileUrl.replace('/upload/', `/upload/${attachmentFlag}/`);
    }

    return fileUrl;
}

export async function downloadFileBlob(url, fileName = 'attachment') {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Download request failed');

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();

        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(blobUrl);
    } catch {
        window.open(url, '_blank');
    }
}
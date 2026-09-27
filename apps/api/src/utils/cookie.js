/* Customize As Per Your Requirements */

export function setCookie(res, cookieName, cookieValue, maxAge) {
    res.cookie(cookieName, cookieValue, {
        maxAge: Number(maxAge), httpOnly: true, secure: true, sameSite: 'none', path: '/',
    });
}

export function getCookie(req, cookieName) {
    if (!req.cookies) return null;
    return req.cookies[cookieName] || null;
}

export function clearCookie(res, cookieName) {
    res.clearCookie(cookieName, {
        httpOnly: true, secure: true, sameSite: 'none', path: '/',
    });
}
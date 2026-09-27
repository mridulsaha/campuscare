export function sendSuccess(res, {statusCode = 200, message = 'Operation successful', data = null, meta = null}) {
    const payload = {
        success: true, message, data,
    };
    if (meta !== null) {
        payload.meta = meta;
    }
    return res.status(statusCode).json(payload);
}

export function sendError(res, {statusCode = 500, error = 'Internal Server Error', details = null, stack = null}) {
    const payload = {
        success: false, error,
    };
    if (details !== null) {
        payload.details = details;
    }
    if (stack !== null) {
        payload.stack = stack;
    }
    return res.status(statusCode).json(payload);
}
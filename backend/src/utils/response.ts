import { Response } from 'express';

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
    res: Response,
    data: T,
    statusCode: number = 200,
    meta?: Record<string, unknown>
): void {
    const response: ApiResponse<T> = { success: true, data };
    if (meta) response.meta = meta;
    res.status(statusCode).json(response);
}

export function sendError(res: Response, message: string, statusCode: number = 500): void {
    res.status(statusCode).json({ success: false, error: message });
}

export function sendPaginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number
): void {
    res.json({
        success: true,
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
        },
    });
}

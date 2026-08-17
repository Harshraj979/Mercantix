/* An interceptor sits between contoller method and client.

while the exception filter catches errors the interceptor catches successful responses
ans shapes them before they leave the server 

NestJS uses RxJS under the hood for interceptors,streams,HTTP
RxJS is a library for working with async data and events over time
RxJS lets u work with values that arrive  over time using something called an Observable
*/

import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
 
export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    data: T;
    timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        const ctx = context.switchToHttp();
        const response = ctx.getRequest();
        const statusCode = response?.statusCode || 200;

        return next.handle().pipe(
            map((data) => {
                if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
                    return data;
                }
                return {
                    success: true,
                    statusCode,
                    data: data ?? null,
                    timestamp: new Date().toISOString(),
                }
            })
        )
    }
}
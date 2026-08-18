//request and performace logging
/* purpose:-
    when building and debugging a backend, you want immediate visiblity into uur terminal about:

    1.Every API endpoint called
    2.What http status code was returned
    3.How fast/slow it ran
*/

import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor
} from '@nestjs/common';

import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { tap } from 'rxjs/operators'; // lets u perform side effect without  changing the value flowing through the observable

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const { method, originalUrl } = request;
        const userAgent = request.get('user-agent') || '';
        const start = Date.now();

        return next.handle().pipe(
            tap(() => {
                const { statusCode } = response;
                const contentLength = response.get('content-length') || '-';
                const duration = Date.now() - start;

                this.logger.log(
                    `${method} ${originalUrl} ${statusCode} ${contentLength} - ${duration}ms [${userAgent}]`,
                );
            })
        )
    }
}
/* when something goes wrong anywhere in the API this filter catches the error
figures out what happened and logs it and sends a clear response to the client */
 
import {
    ArgumentsHost, //Nest Js can handle  diff applications  like http Websockets,Microservices ,ArgumentsHost allows u to access the appropriate context
    Catch,
    ExceptionFilter,
    HttpException, // represents NestJS Http errors
    HttpStatus,
    Logger //for warning
} from '@nestjs/common';
import { Request, Response } from 'express';

//@Catch with no arguments catches EVERY unhandled error across the app
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        // 1. switch context to http (Express)
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        //2. Default fallback values for unexpected errors
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string | string[] = 'Internal server error';
        let error = 'Internal Server Error';


        // 3. If it's a known NestJS HTTP error (400, 401, 403, 404, etc.)
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();

            if (typeof res === 'string') {
                message = res;
                error = exception.name;
            }
            else if (typeof res === 'object' && res != null) {
                const responseObj = res as Record<string, any>;
                message = responseObj.message || exception.message;
                error = responseObj.error || exception.name;
            }
        }

        //4. for generic js errors
        else if (exception instanceof Error) {
            message = exception.message;
            error = exception.name;
        }

        // 5. Log 500 errors as ERROR with stack trace, and 4xx as WARN
        if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(
                `[${request.method}] ${request.url} - Error: ${message}`,
                exception instanceof Error ? exception.stack : undefined,
            );
        }
        else {
            this.logger.warn(
                `[${request.method}] ${request.url} - Status: ${status} - Message: ${JSON.stringify(message)}`,
            );
        }

        response.status(status).json({
            success: false,
            statusCode: status,
            message,
            error,
            timestamp: new Date().toISOString(),
            path: request.url,

        })
    }
}
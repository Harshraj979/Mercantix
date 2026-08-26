import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Req, Res, Headers, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { CurrentUser, Public } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import { JwtPayload } from '@mercantix/contracts';
import { AuthService } from './auth.service';
import { AuthResponseDto, LoginDto, MessageResponseDto, RegisterDto, UserResponseDto } from './dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) { }
    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new user account' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'User registered successfully',
        type: AuthResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Email already exists',
    })

    //register
    async register(
        @Body() dto: RegisterDto,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponseDto> {
        const { accessToken, refreshToken, user } = await this.authService.register(
            dto,
            ip,
            userAgent,
        );
        this.setRefreshTokenCookie(res, refreshToken);
        return { accessToken, user };
    }
    // 2. LOGIN
    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Authenticate user with email & password' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Login successful',
        type: AuthResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Invalid credentials',
    })
    async login(
        @Body() dto: LoginDto,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponseDto> {
        const { accessToken, refreshToken, user } = await this.authService.login(
            dto,
            ip,
            userAgent,
        );
        this.setRefreshTokenCookie(res, refreshToken);
        return { accessToken, user };
    }

    // 3. REFRESH TOKEN (ROTATION)
    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiCookieAuth('refreshToken')
    @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Token refreshed successfully',
        type: AuthResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Invalid or expired refresh token',
    })
    async refresh(
        @Req() req: Request,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponseDto> {
        const rawRefreshToken = req.cookies?.refreshToken;
        if (!rawRefreshToken) {
            throw new UnauthorizedException('Refresh token cookie is missing');
        }
        const { accessToken, refreshToken, user } =
            await this.authService.refreshToken(rawRefreshToken, ip, userAgent);
        this.setRefreshTokenCookie(res, refreshToken);
        return { accessToken, user };
    }

    // 4. LOGOUT
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiCookieAuth('refreshToken')
    @ApiOperation({ summary: 'Log out user and invalidate refresh session' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Logged out successfully',
        type: MessageResponseDto,
    })
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<MessageResponseDto> {
        const rawRefreshToken = req.cookies?.refreshToken;
        await this.authService.logout(rawRefreshToken);
        this.clearRefreshTokenCookie(res);
        return { message: 'Logged out successfully' };
    }

    // 5. CURRENT USER PROFILE
    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get current logged-in user profile' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Current user profile',
        type: UserResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized access',
    })
    async getProfile(@CurrentUser() user: JwtPayload): Promise<UserResponseDto> {
        return this.authService.getProfile(user.sub);
    }

    // --- COOKIE HELPERS ---
    private setRefreshTokenCookie(res: Response, token: string): void {
        const isProduction =
            this.configService.get<string>('nodeEnv') === 'production' ||
            this.configService.get<string>('NODE_ENV') === 'production';
        res.cookie('refreshToken', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            path: '/api/v1/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    }
    private clearRefreshTokenCookie(res: Response): void {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            path: '/api/v1/auth',
        });
    }
}

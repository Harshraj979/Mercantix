import {
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@common/prisma/prisma.service';
import {
    AuthTokenResponse,
    AuthUserResponse,
    JwtPayload,
    RoleName,
    UserStatus,
} from '@mercantix/contracts';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    // 1. REGISTER
    async register(
        dto: RegisterDto,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<AuthTokenResponse & { refreshToken: string }> {
        const email = dto.email.toLowerCase().trim();

        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('A user with this email already exists');
        }

        const passwordHash = await bcrypt.hash(dto.password, 12);
        const targetRole = dto.role || RoleName.BUYER;

        const user = await this.prisma.user.create({
            data: {
                email,
                passwordHash,
                status: UserStatus.ACTIVE,
                roles: {
                    create: {
                        role: {
                            connectOrCreate: {
                                where: { name: targetRole },
                                create: { name: targetRole },
                            },
                        },
                    },
                },
            },
            include: {
                roles: {
                    include: { role: true },
                },
            },
        });

        const roles = user.roles.map((r) => r.role.name as RoleName);
        const { accessToken, refreshToken } = await this.generateTokensAndSession(
            user.id,
            user.email,
            roles,
            ipAddress,
            userAgent,
        );

        return {
            accessToken,
            refreshToken,
            user: this.sanitizeUser(user, roles),
        };
    }

    // 2. LOGIN
    async login(
        dto: LoginDto,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<AuthTokenResponse & { refreshToken: string }> {
        const email = dto.email.toLowerCase().trim();

        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: { role: true },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Account is suspended or inactive');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const roles = user.roles.map((r) => r.role.name as RoleName);
        const { accessToken, refreshToken } = await this.generateTokensAndSession(
            user.id,
            user.email,
            roles,
            ipAddress,
            userAgent,
        );

        return {
            accessToken,
            refreshToken,
            user: this.sanitizeUser(user, roles),
        };
    }

    // 3. REFRESH TOKEN (ROTATION)
    async refreshToken(
        rawRefreshToken: string,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<AuthTokenResponse & { refreshToken: string }> {
        if (!rawRefreshToken) {
            throw new UnauthorizedException('Refresh token is missing');
        }

        let payload: JwtPayload;
        try {
            payload = await this.jwtService.verifyAsync<JwtPayload>(rawRefreshToken, {
                secret: this.refreshSecret,
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const session = await this.prisma.session.findUnique({
            where: { id: payload.sessionId },
            include: {
                user: {
                    include: {
                        roles: {
                            include: { role: true },
                        },
                    },
                },
            },
        });

        // Reuse detection or expired session
        if (!session || session.revokedAt || session.expiresAt < new Date()) {
            if (session?.revokedAt) {
                await this.prisma.session.updateMany({
                    where: { userId: payload.sub },
                    data: { revokedAt: new Date() },
                });
                this.logger.warn(`Revoked refresh token reuse detected for user ${payload.sub}`);
            }
            throw new UnauthorizedException('Session expired or invalidated');
        }

        if (session.refreshTokenHash !== this.hashToken(rawRefreshToken)) {
            await this.prisma.session.update({
                where: { id: session.id },
                data: { revokedAt: new Date() },
            });
            throw new UnauthorizedException('Invalid session token');
        }

        const user = session.user;
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('User account is inactive');
        }

        const roles = user.roles.map((r) => r.role.name as RoleName);
        const expiresAt = this.calculateExpiryDate(this.refreshExpiration);

        // Rotate tokens
        const newRefreshToken = await this.jwtService.signAsync(
            { sub: user.id, email: user.email, roles, sessionId: session.id },
            { secret: this.refreshSecret, expiresIn: this.refreshExpiration },
        );

        const newAccessToken = await this.generateAccessToken(user.id, user.email, roles, session.id);

        await this.prisma.session.update({
            where: { id: session.id },
            data: {
                refreshTokenHash: this.hashToken(newRefreshToken),
                expiresAt,
                ipAddress,
                userAgent,
            },
        });

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            user: this.sanitizeUser(user, roles),
        };
    }

    // 4. LOGOUT
    async logout(rawRefreshToken?: string): Promise<void> {
        if (!rawRefreshToken) return;

        try {
            const payload = this.jwtService.decode(rawRefreshToken) as JwtPayload;
            if (payload?.sessionId) {
                await this.prisma.session.updateMany({
                    where: { id: payload.sessionId, revokedAt: null },
                    data: { revokedAt: new Date() },
                });
            }
        } catch (error) {
            this.logger.error('Failed to revoke session during logout', error);
        }
    }

    // 5. GET PROFILE
    async getProfile(userId: string): Promise<AuthUserResponse> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: { role: true },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const roles = user.roles.map((r) => r.role.name as RoleName);
        return this.sanitizeUser(user, roles);
    }

    // --- HELPERS ---

    private async generateTokensAndSession(
        userId: string,
        email: string,
        roles: RoleName[],
        ipAddress?: string,
        userAgent?: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const sessionId = crypto.randomUUID();
        const expiresAt = this.calculateExpiryDate(this.refreshExpiration);

        const refreshToken = await this.jwtService.signAsync(
            { sub: userId, email, roles, sessionId },
            { secret: this.refreshSecret, expiresIn: this.refreshExpiration },
        );

        await this.prisma.session.create({
            data: {
                id: sessionId,
                userId,
                refreshTokenHash: this.hashToken(refreshToken),
                ipAddress,
                userAgent,
                expiresAt,
            },
        });

        const accessToken = await this.generateAccessToken(userId, email, roles, sessionId);
        return { accessToken, refreshToken };
    }

    private generateAccessToken(
        userId: string,
        email: string,
        roles: RoleName[],
        sessionId: string,
    ): Promise<string> {
        const payload: JwtPayload = { sub: userId, email, roles, sessionId };
        return this.jwtService.signAsync(payload, {
            secret: this.accessSecret,
            expiresIn: this.accessExpiration,
        });
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    private calculateExpiryDate(expiryStr: string): Date {
        const match = expiryStr.match(/^(\d+)([smhd])$/);
        const date = new Date();
        if (!match) {
            date.setDate(date.getDate() + 7);
            return date;
        }

        const value = parseInt(match[1], 10);
        const unit = match[2];

        if (unit === 's') date.setSeconds(date.getSeconds() + value);
        else if (unit === 'm') date.setMinutes(date.getMinutes() + value);
        else if (unit === 'h') date.setHours(date.getHours() + value);
        else if (unit === 'd') date.setDate(date.getDate() + value);

        return date;
    }

    private sanitizeUser(
        user: {
            id: string;
            email: string;
            isEmailVerified: boolean;
            status: any;
            createdAt: Date;
        },
        roles: RoleName[],
    ): AuthUserResponse {
        return {
            id: user.id,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            status: user.status as UserStatus,
            roles,
            createdAt: user.createdAt,
        };
    }

    private get accessSecret(): string {
        return this.configService.get<string>('jwt.accessSecret')!;
    }

    private get refreshSecret(): string {
        return this.configService.get<string>('jwt.refreshSecret') || this.accessSecret;
    }

    private get accessExpiration(): string {
        return this.configService.get<string>('jwt.accessExpiration') || '15m';
    }

    private get refreshExpiration(): string {
        return this.configService.get<string>('jwt.refreshExpiration') || '7d';
    }
}
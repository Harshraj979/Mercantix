import {
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@common/prisma/prisma.service";
import {
    AuthTokenResponse,
    AuthUserResponse,
    JwtPayload,
    RoleName,
    UserStatus
} from "@mercantix/contracts";
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto, RegisterDto } from "./dto";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    // register
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
            throw new ConflictException("A user with this email already exists.");
        }

        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(dto.password, saltRounds);

        const targetRole = dto.role || RoleName.BUYER;
        const user = await this.prisma.$transaction(async (tx) => {
            const role = await tx.role.upsert({
                where: { name: targetRole },
                update: {},
                create: { name: targetRole },
            });

            return tx.user.create({
                data: {
                    email,
                    passwordHash,
                    status: UserStatus.ACTIVE,
                    roles: {
                        create: {
                            roleId: role.id,
                        },
                    },
                },
                include: {
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });
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
    };

    //login
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
                    include: {
                        role: true,
                    },
                },
            },
        });
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException("Account is suspended or inactive");
        }

        //verifying password
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

    // Refresh token
    async refreshToken(
        rawRefreshToken: string,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<AuthTokenResponse & { refreshToken: string }> {
        if (!rawRefreshToken) {
            throw new UnauthorizedException('Refresh token is missing');
        }
        const refreshSecret =
            this.configService.get<string>('JWT_REFRESH_SECRET') ||
            this.configService.get<string>('jwt.refreshSecret') ||
            this.configService.get<string>('JWT_ACCESS_SECRET') ||
            this.configService.get<string>('jwt.accessSecret');

        let payload: JwtPayload;
        try {
            payload = await this.jwtService.verifyAsync<JwtPayload>(rawRefreshToken, {
                secret: refreshSecret,
            });
        }
        catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        //find active session
        const session = await this.prisma.session.findUnique({
            where: { id: payload.sessionId },
            include: {
                user: {
                    include: {
                        roles: {
                            include: {
                                role: true,
                            },
                        },
                    },
                },
            },
        });

        if (!session || session.revokedAt || session.expiresAt < new Date()) {
            if (session?.revokedAt) {
                await this.prisma.session.updateMany({
                    where: { userId: payload.sub },
                    data: { revokedAt: new Date() },
                })
                this.logger.warn(`Security Alert: Revoked refresh token reused for user ${payload.sub}. All sessions revoked.`,);
            }
            throw new UnauthorizedException('Session expired or invalidated');
        }

        const tokenHash = this.hashToken(rawRefreshToken);
        if (session.refreshTokenHash !== tokenHash) {
            await this.prisma.session.update({
                where: { id: session.id },
                data: { revokedAt: new Date() },
            })
            throw new UnauthorizedException('Invalid session token');
        }

        const user = session.user;
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('User account is inactive');
        }

        const roles = user.roles.map((r) => r.role.name as RoleName);

        //Rotate: generate new refresh token,update session

        const refreshExpiryStr =
            this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
            this.configService.get<string>('jwt.refreshExpiration') ||
            '7d';

        const expiresAt = this.calculateExpiryDate(refreshExpiryStr);

        const newRefreshToken = await this.jwtService.signAsync(
            {
                sub: user.id,
                email: user.email,
                roles,
                sessionId: session.id,
            },
            {
                secret: refreshSecret,
                expiresIn: refreshExpiryStr,
            },
        );
        const newAccessToken = await this.generateAccessToken(
            user.id,
            user.email,
            roles,
            session.id,
        );

        //update existing session with new rotated hash
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

    //log out
    async logout(rawRefreshToken?: string, userId?: string): Promise<void> {
        if (!rawRefreshToken) return;
        try {
            const refreshSecret =
                this.configService.get<string>('JWT_REFRESH_SECRET') ||
                this.configService.get<string>('jwt.refreshSecret') ||
                this.configService.get<string>('JWT_ACCESS_SECRET') ||
                this.configService.get<string>('jwt.accessSecret');

            const payload = this.jwtService.decode(rawRefreshToken) as JwtPayload;
            if (payload?.sessionId) {
                await this.prisma.session.updateMany({
                    where: {
                        id: payload.sessionId,
                        revokedAt: null,
                    },
                    data: { revokedAt: new Date() },
                });
            }
        }
        catch (error) {
            this.logger.error('Error during logout session revocation', error);
        }
    }

    //get profile
    async getProfile(userId: string): Promise<AuthUserResponse> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        if (!user) throw new NotFoundException('User not found');
        const roles = user.roles.map((r) => r.role.name as RoleName);
        return this.sanitizeUser(user, roles);
    }

    //all the helper methods
    private async generateTokensAndSession(
        userId: string,
        email: string,
        roles: RoleName[],
        ipAddress?: string,
        userAgent?: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const refreshExpiryStr =
            this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
            this.configService.get<string>('jwt.refreshExpiration') ||
            '7d';
        const expiresAt = this.calculateExpiryDate(refreshExpiryStr);
        const refreshSecret =
            this.configService.get<string>('JWT_REFRESH_SECRET') ||
            this.configService.get<string>('jwt.refreshSecret') ||
            this.configService.get<string>('JWT_ACCESS_SECRET') ||
            this.configService.get<string>('jwt.accessSecret');
        // Create session in DB first to obtain sessionId
        const placeholderHash = crypto.randomBytes(32).toString('hex');
        const session = await this.prisma.session.create({
            data: {
                userId,
                refreshTokenHash: placeholderHash,
                ipAddress,
                userAgent,
                expiresAt,
            },
        });
        // Generate Refresh Token containing sessionId
        const refreshToken = await this.jwtService.signAsync(
            {
                sub: userId,
                email,
                roles,
                sessionId: session.id,
            },
            {
                secret: refreshSecret,
                expiresIn: refreshExpiryStr,
            },
        );
        // Update session with actual hashed refresh token
        await this.prisma.session.update({
            where: { id: session.id },
            data: {
                refreshTokenHash: this.hashToken(refreshToken),
            },
        });
        // Generate Access Token
        const accessToken = await this.generateAccessToken(
            userId,
            email,
            roles,
            session.id,
        );
        return { accessToken, refreshToken };
    }
    private async generateAccessToken(
        userId: string,
        email: string,
        roles: RoleName[],
        sessionId: string,
    ): Promise<string> {
        const accessSecret =
            this.configService.get<string>('JWT_ACCESS_SECRET') ||
            this.configService.get<string>('jwt.accessSecret');
        const accessExpiry =
            this.configService.get<string>('JWT_ACCESS_EXPIRATION') ||
            this.configService.get<string>('jwt.accessExpiration') ||
            '15m';
        const payload: JwtPayload = {
            sub: userId,
            email,
            roles,
            sessionId,
        };
        return this.jwtService.signAsync(payload, {
            secret: accessSecret,
            expiresIn: accessExpiry,
        });
    }
    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    private calculateExpiryDate(expiryStr: string): Date {
        const match = expiryStr.match(/^(\d+)([smhd])$/);
        const date = new Date();
        if (!match) {
            date.setDate(date.getDate() + 7); // Default 7 days
            return date;
        }
        const value = parseInt(match[1], 10);
        const unit = match[2];
        switch (unit) {
            case 's':
                date.setSeconds(date.getSeconds() + value);
                break;
            case 'm':
                date.setMinutes(date.getMinutes() + value);
                break;
            case 'h':
                date.setHours(date.getHours() + value);
                break;
            case 'd':
            default:
                date.setDate(date.getDate() + value);
                break;
        }
        return date;
    }
    private sanitizeUser(user: any, roles: RoleName[]): AuthUserResponse {
        return {
            id: user.id,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            status: user.status,
            roles,
            createdAt: user.createdAt,
        };
    }
}

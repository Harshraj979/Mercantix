import {
    Injectable, // this class is a service that Nestjs can create and inject into other classes
    Logger,    // built in logging system
    OnModuleDestroy, 
    OnModuleInit,
} from '@nestjs/common'

import {PrismaClient} from "@mercantix/database";

@Injectable() // makes class available for dependency injection
export class PrismaService extends PrismaClient implements OnModuleInit,OnModuleDestroy{
    private readonly logger=new Logger(PrismaService.name);

    async onModuleInit() {
        try{
            await this.$connect();
            this.logger.log('prisma connected to database successfully');
        }
        catch(error){
            this.logger.error('Failed to connect to the database via prisma',error);
            throw error;
        }
    }
    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('Prisma disconnected from the database');
    }
}

/* Usually we do const prisma = new PrismaClient();
    but imagine having multiple services like UserService, ProductService
    OrderService, PaymentService, CartService 
    doing new PrismaClient() will cause overhead therefore we create one PrismaService and
    for each function we just call the constructor
*/
import {Global,Module} from "@nestjs/common";
import {PrismaService} from './prisma.service';
// Module used to create a nextJs module
//Global makes the module available throughout the app
@Global()
@Module({
    providers:[PrismaService],
    exports:[PrismaService]
})

export class PrismaModule{}

/* for @Global ,if we create a module and another module wants to use PrismaService
    the other module needs to import PrismaModule but @Global changes this behavious
    ,now once PrismaModule si registered ,its exported providers can be used by other modules
    without importing PrismaModule repeatedly
*/


import {
  Controller,
  Get,
  Injectable,
  Module,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ROLES, type Role } from '@school-system/shared';
import { IsIn, IsOptional } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import type { PaginatedResult } from '../../common/api-response';
import { paginate } from '../../common/pagination';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface UserAccountRecord {
  id: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export class UserAccountDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ enum: ROLES }) role!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ nullable: true, type: String }) lastLoginAt!: string | null;
  @ApiProperty() createdAt!: string;
}

export class UserAccountListDto {
  @ApiProperty({ type: [UserAccountDto] }) data!: UserAccountDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}

export class UserAccountQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ROLES })
  @IsOptional()
  @IsIn([...ROLES])
  role?: Role;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: UserAccountQueryDto): Promise<PaginatedResult<UserAccountDto>> {
    const where = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(
      rows.map((user) => ({
        ...user,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
      })),
      total,
      query,
    );
  }
}

@ApiTags('users')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ type: UserAccountListDto })
  @ApiOperation({
    summary: 'List login accounts (admin only; used to link teacher records)',
  })
  list(@Query() query: UserAccountQueryDto) {
    return this.users.list(query);
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

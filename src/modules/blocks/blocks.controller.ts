import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { BlocksService } from './blocks.service';
import { BlockUserDto } from './dto/block-user.dto';

@ApiTags('Blocks')
@ApiBearerAuth()
@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Users the caller has blocked.' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { items: await this.blocks.listBlocked(user.id) };
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Block a user. Idempotent.' })
  async block(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BlockUserDto,
  ): Promise<void> {
    await this.blocks.block(user.id, dto.userId);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a user. Idempotent.' })
  async unblock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.blocks.unblock(user.id, userId);
  }
}

import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }

  @Patch('me')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Get('me/saved')
  saved(@CurrentUser() user: any) {
    return this.users.getSaved(user.id);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.users.search(q);
  }

  @Get(':username')
  byUsername(@Param('username') username: string) {
    return this.users.getByUsername(username);
  }

  @Get(':username/posts')
  posts(@Param('username') username: string, @CurrentUser() user: any) {
    return this.users.getPosts(username, user.id);
  }
}

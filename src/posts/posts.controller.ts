import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PostsService } from './posts.service';
import { CreateCommentDto, CreatePostDto, UpdatePostDto } from './dto/post.dto';

@Controller('posts')
@UseGuards(FirebaseAuthGuard)
export class PostsController {
  constructor(private posts: PostsService) {}

  @Get('feed')
  feed(@CurrentUser() user: any, @Query('cursor') cursor?: string, @Query('limit') limit?: number) {
    return this.posts.feed(user.id, cursor, limit);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.posts.create(user.id, dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.posts.getOne(id, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdatePostDto) {
    return this.posts.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.posts.remove(id, user.id);
  }

  @Post(':id/like')
  like(@Param('id') id: string, @CurrentUser() user: any) {
    return this.posts.toggleLike(id, user);
  }

  @Post(':id/save')
  save(@Param('id') id: string, @CurrentUser() user: any) {
    return this.posts.toggleSave(id, user.id);
  }

  @Post(':id/share')
  share(@Param('id') id: string) {
    return this.posts.share(id);
  }

  @Get(':id/comments')
  comments(@Param('id') id: string) {
    return this.posts.getComments(id);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: CreateCommentDto) {
    return this.posts.addComment(id, user, dto);
  }

  @Delete('comments/:commentId')
  deleteComment(@Param('commentId') commentId: string, @CurrentUser() user: any) {
    return this.posts.deleteComment(commentId, user.id);
  }
}

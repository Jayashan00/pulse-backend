import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/message.dto';

@Controller('messages')
@UseGuards(FirebaseAuthGuard)
export class MessagesController {
  constructor(private messages: MessagesService) {}

  @Get('conversations')
  conversations(@CurrentUser() user: any) {
    return this.messages.conversations(user.id);
  }

  @Get('conversations/:id')
  getMessages(@Param('id') id: string, @CurrentUser() user: any) {
    return this.messages.getMessages(id, user.id);
  }

  @Post()
  send(@CurrentUser() user: any, @Body() dto: SendMessageDto) {
    return this.messages.send(user.id, dto);
  }
}

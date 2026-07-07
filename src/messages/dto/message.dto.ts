import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsUUID('4', { message: 'Invalid recipient' })
  recipientId: string;

  @IsString() @IsNotEmpty({ message: 'Message cannot be empty' }) @MaxLength(1000)
  text: string;
}

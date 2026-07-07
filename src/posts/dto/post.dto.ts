import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString() @IsNotEmpty({ message: 'Caption is required' }) @MaxLength(500)
  caption: string;

  @IsOptional() @IsUrl({ require_tld: false }, { message: 'Media must be a valid URL' })
  mediaUrl?: string;

  @IsOptional() @IsIn(['image', 'video', 'gif'])
  mediaType?: string;
}

export class UpdatePostDto {
  @IsOptional() @IsString() @MaxLength(500)
  caption?: string;
}

export class CreateCommentDto {
  @IsString() @IsNotEmpty({ message: 'Comment cannot be empty' }) @MaxLength(300)
  text: string;
}

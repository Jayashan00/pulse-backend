import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsString() @MaxLength(60)
  displayName?: string;

  @IsOptional() @IsString() @MaxLength(200)
  bio?: string;

  @IsOptional() @IsUrl({ require_tld: false }, { message: 'Avatar must be a valid URL' })
  avatarUrl?: string;
}

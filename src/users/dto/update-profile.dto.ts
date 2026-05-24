import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  // Note: for future use, if we want to allow users to update their currency preference, we can uncomment the following lines and add validation for allowed currency codes.
  // @IsOptional()
  // @IsString()
  // currency?: string;
}
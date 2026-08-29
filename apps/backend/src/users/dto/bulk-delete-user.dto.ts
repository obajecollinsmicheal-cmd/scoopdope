import { IsArray, ArrayNotEmpty, ArrayMinSize, ArrayMaxSize, IsUUID } from 'class-validator';

export class BulkDeleteUserDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids: string[];
}

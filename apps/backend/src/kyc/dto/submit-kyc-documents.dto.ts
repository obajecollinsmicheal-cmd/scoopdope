import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { KycDocumentType } from '../kyc-customer.entity';

export class SubmitKycDocumentsDto {
  @ApiProperty({ description: 'Stellar public key of the user' })
  @IsString()
  stellarPublicKey: string;

  @ApiProperty({
    enum: ['id_card', 'passport', 'drivers_license'],
    description: 'Type of identity document being submitted',
  })
  @IsEnum(['id_card', 'passport', 'drivers_license'])
  documentType: KycDocumentType;

  @ApiProperty({ description: 'URL to the uploaded document image' })
  @IsUrl()
  documentUrl: string;

  @ApiPropertyOptional({ description: 'URL to the uploaded selfie image' })
  @IsOptional()
  @IsUrl()
  selfieUrl?: string;
}

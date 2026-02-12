import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { BillingType } from '@prisma/client';

export class CreateCheckoutDto {
  @IsArray()
  @IsString({ each: true })
  courseIds: string[];

  @IsEnum(BillingType)
  billingType: BillingType;
}

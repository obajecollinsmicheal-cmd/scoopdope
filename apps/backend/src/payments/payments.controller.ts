import {
  Controller, Post, Get, Body, Param, Headers, RawBodyRequest, Query,
  Req, UseGuards, HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CurrencyConversionService, SUPPORTED_CURRENCIES, SupportedCurrency } from './currency-conversion.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@ApiTags('payments')
@Controller('v1/payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private currencyConversion: CurrencyConversionService,
  ) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent for a course purchase' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.paymentsService.createPaymentIntent(dto.courseId, dto.currency, user.id, dto.couponCode);
  }

  @Get('preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview order details before payment' })
  @ApiResponse({ status: 200, description: 'Order preview returned successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  previewOrder(
    @Query('courseId') courseId: string,
    @Query('currency') currency: SupportedCurrency,
    @Query('couponCode') couponCode?: string,
  ) {
    return this.paymentsService.previewOrder(courseId, currency ?? 'USD', couponCode);
  }

  @Get('price/:courseId')
  @ApiOperation({ summary: 'Get course price in a specific currency' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getPrice(
    @Param('courseId') courseId: string,
    @Headers('accept-language') acceptLanguage: string,
  ) {
    const currency = this.currencyConversion.detectCurrencyFromLocale(acceptLanguage ?? 'en-US');
    return this.paymentsService.getPriceInCurrency(courseId, currency);
  }

  @Get('currencies')
  @ApiOperation({ summary: 'List supported currencies' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getSupportedCurrencies() {
    return { currencies: SUPPORTED_CURRENCIES };
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    await this.paymentsService.handleWebhook(signature, req.rawBody!);
    return { received: true };
  }
}

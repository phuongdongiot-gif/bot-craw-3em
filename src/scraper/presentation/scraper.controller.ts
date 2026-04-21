import { Controller, Get, Post, Delete, HttpCode, Body, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TriggerScrapeCommand } from '../application/commands/trigger-scrape.command';
import { GetScrapedProductsQuery } from '../application/queries/get-scraped-products.query';
import { TriggerScrapeDto } from './dto/trigger-scrape.dto';
import { TriggerScrapeHandler } from '../application/commands/trigger-scrape.handler';

@ApiTags('Scraper DDD CQRS')
@Controller('scraper')
export class ScraperController {
  private readonly logger = new Logger(ScraperController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly triggerHandler: TriggerScrapeHandler,
  ) {}

  @Post('trigger')
  @HttpCode(202)
  @ApiOperation({ summary: 'CQRS COMMAND: Ra lệnh tiến trình cào dữ liệu (Async)' })
  @ApiResponse({ status: 202, description: 'Lệnh đã đưa vào Command Bus' })
  async triggerScrape(@Body() dto: TriggerScrapeDto) {
    // Fire-and-forget: Không await để trả 202 ngay, nhưng PHẢI có .catch() bắt lỗi
    this.commandBus
      .execute(new TriggerScrapeCommand(dto?.targetUrl))
      .catch((err) => this.logger.error('❌ TriggerScrapeCommand thất bại:', err?.message));

    return { message: 'Command dispatched. Scraping running in background.' };
  }

  @Get('products')
  @ApiOperation({ summary: 'CQRS QUERY: Lấy Query Model danh sách sản phẩm' })
  @ApiResponse({ status: 200, description: 'Trả về Entity Model hiện tại' })
  async getProducts() {
    return this.queryBus.execute(new GetScrapedProductsQuery());
  }

  @Delete('cache')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xóa cache URL đã cào — cho phép cào lại toàn bộ danh sách' })
  @ApiResponse({ status: 200, description: 'Cache đã được xóa' })
  clearCache() {
    this.triggerHandler.clearProcessedUrls();
    return { message: 'URL cache đã được xóa. Có thể trigger cào lại từ đầu.' };
  }
}

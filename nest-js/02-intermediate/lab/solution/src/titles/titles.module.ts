import { Module } from '@nestjs/common';
import { TitlesController } from './titles.controller';
import { TitlesService } from './titles.service';

@Module({
  controllers: [TitlesController],
  providers: [TitlesService],
})
export class TitlesModule {}

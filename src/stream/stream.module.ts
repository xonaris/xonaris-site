import { Module } from '@nestjs/common';
import { StreamController } from './stream.controller';
import { StreamService } from './stream.service';
import { AuthModule } from '../auth/auth.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [AuthModule, ChannelsModule],
  controllers: [StreamController],
  providers: [StreamService],
})
export class StreamModule {}

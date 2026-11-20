import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AfricasTalkingSmsProvider, MockSmsProvider, SmsProvider } from './sms-provider';

@Module({
  providers: [
    {
      provide: 'SMS_PROVIDER',
      useFactory: (config: ConfigService) => {
        const username = config.get<string>('AT_USERNAME');
        const apiKey = config.get<string>('AT_API_KEY');
        if (username && apiKey) {
          return new AfricasTalkingSmsProvider(username, apiKey, config.get<string>('AT_SENDER_ID'));
        }
        return new MockSmsProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: ['SMS_PROVIDER'],
})
export class SmsModule {}

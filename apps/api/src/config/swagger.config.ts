import { DocumentBuilder } from '@nestjs/swagger';

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('School System API')
    .setDescription(
      'School management API for Kenyan primary, JSS and secondary schools. ' +
        'Grading supports CBC performance levels and 8-4-4 numeric bands. Currency is KES; ' +
        'all date logic uses Africa/Nairobi.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addCookieAuth('ss_refresh')
    .build();
}

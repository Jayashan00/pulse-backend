import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: 'Pulse API',
      status: 'online',
      version: '1.0.0',
      documentation: 'https://github.com/Jayashan00/pulse-backend#api-endpoints-prefix-api',
      endpoints: {
        auth: '/api/auth (signup, login, logout)',
        posts: '/api/posts (feed, CRUD, likes, saves, comments)',
        users: '/api/users (profiles, search, saved)',
        notifications: '/api/notifications',
        messages: '/api/messages',
        upload: '/api/upload',
      },
      note: 'All endpoints except auth require a Firebase ID token (Authorization: Bearer <token>).',
    };
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}